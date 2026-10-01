import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

export type OrderEmail = 'requested' | 'accepted' | 'finished' | 'review';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async welcome(userId: string) {
    await this.deliver('welcome', async () => {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
        select: { name: true, email: true },
      });
      return {
        to: user.email,
        subject: 'Boas-vindas à Proxi!',
        text: `Olá, ${user.name}!\n\nSeu cadastro na Proxi foi realizado com sucesso. Estamos felizes em ter você por aqui!\n\nAcesse sua conta: ${this.link('/')}`,
      };
    });
  }

  async order(kind: OrderEmail, orderId: bigint) {
    await this.deliver(kind, async () => {
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: {
          scheduledFor: true,
          client: { select: { name: true, email: true } },
          service: {
            select: {
              title: true,
              provider: {
                select: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      });
      const provider = order.service.provider.user;
      const date = order.scheduledFor
        ? new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'America/Sao_Paulo',
          }).format(order.scheduledFor) + ' (horário de Brasília)'
        : 'Consulte o horário no pedido';
      const messages = {
        requested: {
          to: provider.email,
          subject: 'Você recebeu uma solicitação de agendamento',
          text: `Olá, ${provider.name}!\n\n${order.client.name} solicitou o serviço ${order.service.title}.\nAgendamento: ${date}.\n\nConfira e responda à solicitação: ${this.link(`/orders/${orderId}`)}`,
        },
        accepted: {
          to: order.client.email,
          subject: 'Seu agendamento foi aceito',
          text: `Olá, ${order.client.name}!\n\n${provider.name} aceitou seu agendamento de ${order.service.title}.\nAgendamento: ${date}.\n\nAcesse o pedido para conferir os detalhes e realizar o pagamento: ${this.link(`/orders/${orderId}`)}`,
        },
        finished: {
          to: order.client.email,
          subject: 'Serviço finalizado: confirme e avalie o atendimento',
          text: `Olá, ${order.client.name}!\n\n${provider.name} informou a finalização de ${order.service.title}.\n\nConfirme a conclusão para avaliar o serviço e o prestador: ${this.link(`/orders/${orderId}/confirm`)}\nSe houver algum problema, você também pode reportá-lo pelo pedido.`,
        },
        review: {
          to: order.client.email,
          subject: 'Como foi seu atendimento? Avalie na Proxi',
          text: `Olá, ${order.client.name}!\n\nA conclusão de ${order.service.title}, realizado por ${provider.name}, foi confirmada. Sua opinião ajuda outros clientes!\n\nAvalie o serviço e o prestador: ${this.link(`/orders/${orderId}/review`)}`,
        },
      };
      return messages[kind];
    });
  }

  private link(path: string) {
    const base = this.config.get<string>('NOTIFICATION_FRONTEND_URL');
    if (!base) throw new Error('Missing notification frontend URL');
    const url = new URL(base);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (this.config.get('NODE_ENV') === 'production' &&
        url.protocol !== 'https:')
    ) {
      throw new Error('Invalid notification frontend URL');
    }
    return new URL(path, url).toString();
  }

  // Delivery failures must not turn an already committed action into an API failure.
  private async deliver(
    kind: string,
    build: () => Promise<{ to: string; subject: string; text: string }>,
  ) {
    let transport: nodemailer.Transporter | undefined;
    try {
      const smtp = this.config.get<string>('SMTP_URL');
      const from = this.config.get<string>('MAIL_FROM');
      if (!smtp || !from) throw new Error('Missing SMTP configuration');
      const message = await build();
      transport = nodemailer.createTransport({
        url: smtp,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      await transport.sendMail({ from, ...message });
    } catch {
      // Never log recipient addresses, message bodies or SMTP credentials.
      this.logger.error(`Notification email delivery failed (${kind})`);
    } finally {
      transport?.close();
    }
  }
}
