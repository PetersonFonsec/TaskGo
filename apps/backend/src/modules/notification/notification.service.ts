import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PushMessage } from '../push/push-transport';
import { PushService } from '../push/push.service';
import { EmailMessage, EmailTransport } from './email-transport';
import { EmailContent, renderEmail } from './email-template';
import { InAppNotificationService } from './in-app-notification.service';

export interface Recipient {
  /** Com o id, o aviso também sai por push nos aparelhos do usuário. */
  id?: bigint;
  email: string;
  name: string;
}

/** Dados mínimos do pedido exibidos nos e-mails do ciclo de atendimento. */
export interface OrderNotification {
  id: bigint;
  serviceTitle: string;
  scheduledFor?: Date | null;
}

const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly transport: EmailTransport,
    @Optional() config?: ConfigService,
    @Optional() private readonly push?: PushService,
    @Optional() private readonly inApp?: InAppNotificationService,
  ) {
    this.frontendUrl = this.resolveFrontendUrl(config);
  }

  /** Falhas propagam: use quando o chamador precisa saber se a entrega ocorreu. */
  async sendAdminInvitation(
    recipient: Recipient,
    activationUrl: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.transport.send(
      this.compose(recipient.email, 'admin-invitation', {
        subject: 'Convite para o backoffice Proxi',
        preheader: 'Ative sua conta para acessar o backoffice.',
        greeting: `Olá, ${recipient.name}.`,
        paragraphs: [
          'Você foi convidado para acessar o backoffice Proxi. Ative sua conta e crie sua senha pelo botão abaixo.',
        ],
        cta: { label: 'Ativar minha conta', url: activationUrl },
        footnote: `O convite expira em ${this.formatDate(expiresAt)}. Se você não esperava este convite, ignore esta mensagem.`,
      }),
    );
  }

  async sendEmailVerificationCode(email: string, code: string): Promise<void> {
    await this.transport.send(
      this.compose(email, 'email-verification', {
        subject: 'Seu código de verificação Proxi',
        preheader: `Seu código de verificação é ${code}.`,
        paragraphs: [
          `Seu código de verificação é ${code}. Digite-o no app para confirmar seu e-mail.`,
        ],
        code,
        footnote: 'Se você não solicitou, ignore esta mensagem.',
      }),
    );
  }

  /** Eventos do atendimento: a falha na entrega não interrompe o fluxo do pedido. */
  async notifyProviderReviewReceived(
    provider: Recipient,
    orderId: bigint,
    rating: number,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        provider.email,
        'review-received',
        {
          subject: 'Você recebeu uma nova avaliação',
          greeting: `Olá, ${provider.name}.`,
          paragraphs: [
            `O cliente do pedido #${orderId.toString()} avaliou seu atendimento com nota ${rating} de 5.`,
          ],
          cta: {
            label: 'Ver o pedido',
            url: this.link(`/orders/${orderId.toString()}`),
          },
        },
        `review-received/${orderId.toString()}`,
      ),
    );
    await this.pushTo(provider, () => ({
      title: 'Nova avaliação',
      body: `Você recebeu nota ${rating} de 5 no pedido #${orderId.toString()}.`,
      data: this.orderData('REVIEW_RECEIVED', orderId),
    }));
    await this.notifyInApp(
      provider,
      'Nova avaliação',
      `Você recebeu nota ${rating} de 5 no pedido #${orderId.toString()}.`,
      'REVIEW_RECEIVED',
      orderId,
    );
  }

  async notifyProviderOrderConfirmed(
    provider: Recipient,
    orderId: bigint,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        provider.email,
        'completion-confirmed',
        {
          subject: 'Cliente confirmou a conclusão do serviço',
          greeting: `Olá, ${provider.name}.`,
          paragraphs: [
            `O cliente confirmou a conclusão do pedido #${orderId.toString()} e o pagamento foi registrado.`,
          ],
          cta: {
            label: 'Ver meus recebimentos',
            url: this.link('/provider/recebimentos'),
          },
        },
        `completion-confirmed/${orderId.toString()}`,
      ),
    );
    await this.pushTo(provider, () => ({
      title: 'Serviço confirmado',
      body: `O cliente confirmou a conclusão do pedido #${orderId.toString()}.`,
      data: this.orderData('COMPLETION_CONFIRMED', orderId),
    }));
    await this.notifyInApp(
      provider,
      'Serviço confirmado',
      `O cliente confirmou a conclusão do pedido #${orderId.toString()}.`,
      'COMPLETION_CONFIRMED',
      orderId,
    );
  }

  async notifyProviderNewOrder(
    provider: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        provider.email,
        'order-requested',
        {
          subject: 'Nova solicitação de serviço',
          preheader: `"${order.serviceTitle}"${this.describeSchedule(order)}. Aceite ou recuse.`,
          greeting: `Olá, ${provider.name}.`,
          paragraphs: [
            `Você recebeu a solicitação #${order.id.toString()} para "${order.serviceTitle}"` +
              `${this.describeSchedule(order)}.`,
            'Responda o quanto antes: sem resposta, a solicitação expira e o horário volta para a sua agenda.',
          ],
          cta: {
            label: 'Aceitar ou recusar',
            url: this.link(`/provider/${order.id.toString()}/aprovacao`),
          },
        },
        `order-requested/${order.id.toString()}`,
      ),
    );
    await this.pushTo(provider, () => ({
      title: 'Nova solicitação',
      body: `"${order.serviceTitle}"${this.describeSchedule(order)}. Aceite ou recuse.`,
      data: this.orderData('ORDER_REQUESTED', order.id),
    }));
    await this.notifyInApp(
      provider,
      'Nova solicitação',
      `Você recebeu uma solicitação para "${order.serviceTitle}"${this.describeSchedule(order)}.`,
      'ORDER_REQUESTED',
      order.id,
    );
  }

  async notifyOrderExpired(
    client: Recipient,
    provider: Recipient,
    order: OrderNotification,
    waitingFor: 'PROVIDER' | 'PAYMENT',
  ): Promise<void> {
    const id = order.id.toString();
    const clientReason =
      waitingFor === 'PROVIDER'
        ? 'o prestador não respondeu a tempo'
        : 'o pagamento não foi concluído a tempo';
    await this.sendSafely(() =>
      this.compose(
        client.email,
        'order-expired',
        {
          subject: 'Seu pedido expirou',
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `O pedido #${id} para "${order.serviceTitle}" expirou porque ${clientReason}. ` +
              'O horário foi liberado e nenhum valor foi cobrado.',
          ],
          cta: {
            label: 'Encontrar outro profissional',
            url: this.link('/customer/search'),
          },
        },
        `order-expired/client/${id}`,
      ),
    );
    await this.sendSafely(() =>
      this.compose(
        provider.email,
        'order-expired',
        {
          subject: 'Uma solicitação expirou',
          greeting: `Olá, ${provider.name}.`,
          paragraphs: [
            `A solicitação #${id} para "${order.serviceTitle}" expirou` +
              (waitingFor === 'PROVIDER'
                ? ' sem resposta e o horário voltou para a sua agenda.'
                : ' porque o cliente não concluiu o pagamento. O horário voltou para a sua agenda.'),
          ],
          cta: { label: 'Ver meus pedidos', url: this.link('/provider') },
        },
        `order-expired/provider/${id}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: 'Seu pedido expirou',
      body: `O pedido de "${order.serviceTitle}" expirou porque ${clientReason}. Nenhum valor foi cobrado.`,
      data: this.orderData('ORDER_EXPIRED', order.id),
    }));
    await this.pushTo(provider, () => ({
      title: 'Solicitação expirada',
      body: `A solicitação #${id} expirou e o horário voltou para a sua agenda.`,
      data: this.orderData('ORDER_EXPIRED', order.id),
    }));
    await this.notifyInApp(
      client,
      'Seu pedido expirou',
      `O pedido para "${order.serviceTitle}" expirou porque ${clientReason}. Nenhum valor foi cobrado.`,
      'ORDER_EXPIRED',
      order.id,
    );
    await this.notifyInApp(
      provider,
      'Solicitação expirada',
      `A solicitação #${id} para "${order.serviceTitle}" expirou e o horário voltou para a sua agenda.`,
      'ORDER_EXPIRED',
      order.id,
    );
  }

  async notifyClientOrderAccepted(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        client.email,
        'order-accepted',
        {
          subject: 'Seu pedido foi aceito',
          preheader: 'Pague o PIX para garantir o horário.',
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `O prestador aceitou o pedido #${order.id.toString()} para "${order.serviceTitle}"` +
              `${this.describeSchedule(order)}.`,
            'Conclua o pagamento para garantir o agendamento.',
          ],
          cta: {
            label: 'Pagar e garantir o horário',
            url: this.link(`/orders/${order.id.toString()}/payment`),
          },
        },
        `order-accepted/${order.id.toString()}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: 'Pedido aceito',
      body: `O prestador aceitou "${order.serviceTitle}". Pague o PIX para garantir o horário.`,
      data: this.orderData('ORDER_ACCEPTED', order.id),
    }));
    await this.notifyInApp(
      client,
      'Pedido aceito',
      `O prestador aceitou "${order.serviceTitle}". Pague o PIX para garantir o horário.`,
      'ORDER_ACCEPTED',
      order.id,
    );
  }

  async notifyClientOrderCanceledByProvider(
    client: Recipient,
    order: OrderNotification,
    outcome: { refused: boolean; refunded: boolean },
  ): Promise<void> {
    const action = outcome.refused ? 'recusou' : 'cancelou';
    await this.sendSafely(() =>
      this.compose(
        client.email,
        outcome.refused ? 'order-refused' : 'order-canceled',
        {
          subject: outcome.refused
            ? 'Seu pedido foi recusado'
            : 'Seu pedido foi cancelado',
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `O prestador ${action} o pedido #${order.id.toString()} para "${order.serviceTitle}".`,
            ...(outcome.refunded
              ? ['O valor pago será estornado pelo mesmo meio de pagamento.']
              : []),
          ],
          cta: {
            label: 'Ver detalhes do pedido',
            url: this.link(`/orders/${order.id.toString()}`),
          },
        },
        `order-canceled/${order.id.toString()}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: outcome.refused ? 'Pedido recusado' : 'Pedido cancelado',
      body:
        `O prestador ${action} "${order.serviceTitle}".` +
        (outcome.refunded ? ' O valor pago será estornado.' : ''),
      data: this.orderData(
        outcome.refused ? 'ORDER_REFUSED' : 'ORDER_CANCELED',
        order.id,
      ),
    }));
    await this.notifyInApp(
      client,
      outcome.refused ? 'Pedido recusado' : 'Pedido cancelado',
      `O prestador ${action} "${order.serviceTitle}".${outcome.refunded ? ' O valor pago será estornado.' : ''}`,
      outcome.refused ? 'ORDER_REFUSED' : 'ORDER_CANCELED',
      order.id,
    );
  }

  async notifyClientPaymentConfirmed(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        client.email,
        'payment-confirmed',
        {
          subject: 'Pagamento confirmado: serviço agendado',
          preheader: `"${order.serviceTitle}" está agendado${this.describeSchedule(order, 'para')}.`,
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `Recebemos o pagamento do pedido #${order.id.toString()} para "${order.serviceTitle}". ` +
              `O serviço está agendado${this.describeSchedule(order, 'para')}.`,
            'O valor fica retido com a Proxi e só é repassado ao prestador depois que você confirmar a conclusão do serviço.',
          ],
          cta: {
            label: 'Acompanhar pedido',
            url: this.link(`/orders/${order.id.toString()}`),
          },
        },
        `payment-confirmed/client/${order.id.toString()}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: 'Pagamento confirmado',
      body: `"${order.serviceTitle}" está agendado${this.describeSchedule(order, 'para')}.`,
      data: this.orderData('PAYMENT_CONFIRMED', order.id),
    }));
    await this.notifyInApp(
      client,
      'Pagamento confirmado',
      `"${order.serviceTitle}" está agendado${this.describeSchedule(order, 'para')}.`,
      'PAYMENT_CONFIRMED',
      order.id,
    );
  }

  /** Pagamento aprovado: o horário está garantido também para o prestador. */
  async notifyProviderBookingConfirmed(
    provider: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    const id = order.id.toString();
    const body = `O cliente pagou "${order.serviceTitle}". O agendamento está confirmado${this.describeSchedule(order, 'para')}.`;
    await this.sendSafely(() =>
      this.compose(
        provider.email,
        'booking-confirmed',
        {
          subject: 'Agendamento confirmado: pagamento recebido',
          preheader: body,
          greeting: `Olá, ${provider.name}.`,
          paragraphs: [
            `O cliente pagou o pedido #${id} para "${order.serviceTitle}". ` +
              `O agendamento está confirmado${this.describeSchedule(order, 'para')}.`,
            'O valor fica retido com a Proxi e é repassado a você depois que o cliente confirmar a conclusão do serviço.',
          ],
          cta: { label: 'Ver o pedido', url: this.link(`/orders/${id}`) },
        },
        `payment-confirmed/provider/${id}`,
      ),
    );
    await this.pushTo(provider, () => ({
      title: 'Agendamento confirmado',
      body,
      data: this.orderData('BOOKING_CONFIRMED', order.id),
    }));
    await this.notifyInApp(
      provider,
      'Agendamento confirmado',
      body,
      'BOOKING_CONFIRMED',
      order.id,
    );
  }

  async notifyClientProviderOnTheWay(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        client.email,
        'provider-on-the-way',
        {
          subject: 'O prestador está a caminho',
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `O prestador do pedido #${order.id.toString()} ("${order.serviceTitle}") está a caminho.`,
          ],
          cta: {
            label: 'Acompanhar pedido',
            url: this.link(`/orders/${order.id.toString()}`),
          },
        },
        `provider-on-the-way/${order.id.toString()}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: 'Prestador a caminho',
      body: `O prestador de "${order.serviceTitle}" está indo até você.`,
      data: this.orderData('PROVIDER_ON_THE_WAY', order.id),
    }));
    await this.notifyInApp(
      client,
      'Prestador a caminho',
      `O prestador de "${order.serviceTitle}" está indo até você.`,
      'PROVIDER_ON_THE_WAY',
      order.id,
    );
  }

  async notifyClientServiceFinished(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() =>
      this.compose(
        client.email,
        'service-finished',
        {
          subject: 'Serviço finalizado: confirme a conclusão',
          greeting: `Olá, ${client.name}.`,
          paragraphs: [
            `O prestador informou a conclusão do pedido #${order.id.toString()} ("${order.serviceTitle}").`,
            'Confirme a conclusão ou, se algo deu errado, reporte um problema pelo pedido.',
          ],
          cta: {
            label: 'Confirmar conclusão',
            url: this.link(`/orders/${order.id.toString()}/confirm`),
          },
        },
        `service-finished/${order.id.toString()}`,
      ),
    );
    await this.pushTo(client, () => ({
      title: 'Serviço finalizado',
      body: `Confirme a conclusão de "${order.serviceTitle}" ou reporte um problema.`,
      data: this.orderData('SERVICE_FINISHED', order.id),
    }));
    await this.notifyInApp(
      client,
      'Serviço finalizado',
      `Confirme a conclusão de "${order.serviceTitle}" ou reporte um problema.`,
      'SERVICE_FINISHED',
      order.id,
    );
  }

  private async notifyInApp(
    recipient: Recipient,
    title: string,
    body: string,
    type: string,
    orderId: bigint,
  ) {
    if (!this.inApp || recipient.id === undefined) return;
    try {
      await this.inApp.create({
        userId: recipient.id,
        title,
        body,
        type,
        orderId,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao persistir notificação in-app: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Nunca rejeita: a montagem e a entrega ficam protegidas, permitindo que os
   * handlers disparem o aviso após o commit sem aguardar o SMTP.
   */
  private async sendSafely(build: () => EmailMessage): Promise<void> {
    try {
      const message = build();
      await this.transport.send(message);
    } catch {
      this.logger.error('Falha ao enviar notificação por e-mail');
    }
  }

  /** Push só para quem tem id; como o e-mail, nunca rejeita. */
  private async pushTo(recipient: Recipient, build: () => PushMessage) {
    if (!this.push || recipient.id === undefined) return;
    try {
      await this.push.sendToUser(recipient.id, build());
    } catch (error) {
      this.logger.error(`Falha ao montar o push: ${(error as Error).message}`);
    }
  }

  private compose(
    to: string,
    category: string,
    content: EmailContent,
    idempotencyKey?: string,
  ): EmailMessage {
    return {
      to,
      category,
      idempotencyKey,
      ...renderEmail(content),
    };
  }

  private orderData(type: string, orderId: bigint): Record<string, string> {
    return { type, orderId: orderId.toString() };
  }

  private describeSchedule(order: OrderNotification, preposition = 'em') {
    if (!order.scheduledFor) return '';
    const schedule = order.scheduledFor.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return ` ${preposition} ${schedule}`;
  }

  private link(path: string): string {
    return `${this.frontendUrl}${path}`;
  }

  /** FRONTEND_URL; sem ela, a primeira origem pública configurada para CORS. */
  private resolveFrontendUrl(config?: ConfigService): string {
    const configured =
      config?.get<string>('FRONTEND_URL')?.trim() ||
      config
        ?.get<string>('PUBLIC_FRONTEND_ORIGINS')
        ?.split(',')
        .map((origin) => origin.trim())
        .find(Boolean) ||
      DEFAULT_FRONTEND_URL;
    return configured.replace(/\/+$/, '');
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}
