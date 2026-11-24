import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailContent, renderEmail } from '../notification/email-template';
import { EmailTransport } from '../notification/email-transport';

export type OrderEmail = 'requested' | 'accepted' | 'finished' | 'review';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly transport: EmailTransport,
  ) {}

  async welcome(userId: string) {
    await this.deliver('welcome', `welcome/${userId}`, async () => {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: BigInt(userId) },
        select: { name: true, email: true },
      });
      return {
        to: user.email,
        content: {
          subject: 'Boas-vindas à Proxi!',
          preheader: 'Seu cadastro foi realizado com sucesso.',
          greeting: `Olá, ${user.name}!`,
          paragraphs: [
            'Seu cadastro na Proxi foi realizado com sucesso. Estamos felizes em ter você por aqui!',
          ],
          cta: { label: 'Acessar minha conta', url: this.link('/') },
        },
      };
    });
  }

  async order(kind: OrderEmail, orderId: bigint) {
    await this.deliver(
      kind,
      `order-${kind}/${orderId.toString()}`,
      async () => {
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
        const messages: Record<
          OrderEmail,
          { to: string; content: EmailContent }
        > = {
          requested: {
            to: provider.email,
            content: {
              subject: 'Você recebeu uma solicitação de agendamento',
              greeting: `Olá, ${provider.name}!`,
              paragraphs: [
                `${order.client.name} solicitou o serviço ${order.service.title}.`,
                `Agendamento: ${date}.`,
              ],
              cta: {
                label: 'Responder à solicitação',
                url: this.link(`/orders/${orderId}`),
              },
            },
          },
          accepted: {
            to: order.client.email,
            content: {
              subject: 'Seu agendamento foi aceito',
              greeting: `Olá, ${order.client.name}!`,
              paragraphs: [
                `${provider.name} aceitou seu agendamento de ${order.service.title}.`,
                `Agendamento: ${date}.`,
                'Acesse o pedido para conferir os detalhes e realizar o pagamento.',
              ],
              cta: {
                label: 'Ver pedido e pagar',
                url: this.link(`/orders/${orderId}`),
              },
            },
          },
          finished: {
            to: order.client.email,
            content: {
              subject: 'Serviço finalizado: confirme e avalie o atendimento',
              greeting: `Olá, ${order.client.name}!`,
              paragraphs: [
                `${provider.name} informou a finalização de ${order.service.title}.`,
                'Confirme a conclusão para avaliar o serviço e o prestador. Se houver algum problema, você também pode reportá-lo pelo pedido.',
              ],
              cta: {
                label: 'Confirmar conclusão',
                url: this.link(`/orders/${orderId}/confirm`),
              },
            },
          },
          review: {
            to: order.client.email,
            content: {
              subject: 'Como foi seu atendimento? Avalie na Proxi',
              greeting: `Olá, ${order.client.name}!`,
              paragraphs: [
                `A conclusão de ${order.service.title}, realizado por ${provider.name}, foi confirmada. Sua opinião ajuda outros clientes!`,
              ],
              cta: {
                label: 'Avaliar o serviço e o prestador',
                url: this.link(`/orders/${orderId}/review`),
              },
            },
          },
        };
        return messages[kind];
      },
    );
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
    idempotencyKey: string,
    build: () => Promise<{ to: string; content: EmailContent }>,
  ) {
    try {
      const { to, content } = await build();
      await this.transport.send({
        to,
        category: kind,
        idempotencyKey,
        ...renderEmail(content),
      });
    } catch {
      // Never log recipient addresses, message bodies or provider credentials.
      this.logger.error(`Notification email delivery failed (${kind})`);
    }
  }
}
