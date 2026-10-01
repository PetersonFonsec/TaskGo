import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailMessage, EmailTransport } from './email-transport';

export interface Recipient {
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
    config?: ConfigService,
  ) {
    this.frontendUrl = this.resolveFrontendUrl(config);
  }

  /** Falhas propagam: use quando o chamador precisa saber se a entrega ocorreu. */
  async sendAdminInvitation(
    recipient: Recipient,
    activationUrl: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.transport.send({
      to: recipient.email,
      subject: 'Convite para o backoffice Proxi',
      text:
        `Olá, ${recipient.name}.\n\n` +
        `Você foi convidado para acessar o backoffice Proxi. ` +
        `Ative sua conta em ${activationUrl}\n` +
        `O convite expira em ${this.formatDate(expiresAt)}.`,
    });
  }

  async sendEmailVerificationCode(email: string, code: string): Promise<void> {
    await this.transport.send({
      to: email,
      subject: 'Seu código de verificação Proxi',
      text: `Seu código de verificação é ${code}. Se você não solicitou, ignore esta mensagem.`,
    });
  }

  /** Eventos do atendimento: a falha na entrega não interrompe o fluxo do pedido. */
  async notifyProviderReviewReceived(
    provider: Recipient,
    orderId: bigint,
    rating: number,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: provider.email,
      subject: 'Você recebeu uma nova avaliação',
      text:
        `Olá, ${provider.name}.\n\n` +
        `O cliente do pedido #${orderId.toString()} avaliou seu atendimento com nota ${rating} de 5.`,
    }));
  }

  async notifyProviderOrderConfirmed(
    provider: Recipient,
    orderId: bigint,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: provider.email,
      subject: 'Cliente confirmou a conclusão do serviço',
      text:
        `Olá, ${provider.name}.\n\n` +
        `O cliente confirmou a conclusão do pedido #${orderId.toString()} e o pagamento foi registrado.`,
    }));
  }

  async notifyProviderNewOrder(
    provider: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: provider.email,
      subject: 'Nova solicitação de serviço',
      text:
        `Olá, ${provider.name}.\n\n` +
        `Você recebeu a solicitação #${order.id.toString()} para "${order.serviceTitle}"` +
        `${this.describeSchedule(order)}.\n` +
        `Aceite ou recuse em ${this.link(`/provider/${order.id.toString()}/aprovacao`)}`,
    }));
  }

  async notifyClientOrderAccepted(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: client.email,
      subject: 'Seu pedido foi aceito',
      text:
        `Olá, ${client.name}.\n\n` +
        `O prestador aceitou o pedido #${order.id.toString()} para "${order.serviceTitle}"` +
        `${this.describeSchedule(order)}.\n` +
        `Conclua o pagamento para garantir o agendamento: ` +
        this.link(`/orders/${order.id.toString()}/payment`),
    }));
  }

  async notifyClientOrderCanceledByProvider(
    client: Recipient,
    order: OrderNotification,
    outcome: { refused: boolean; refunded: boolean },
  ): Promise<void> {
    const action = outcome.refused ? 'recusou' : 'cancelou';
    await this.sendSafely(() => ({
      to: client.email,
      subject: outcome.refused
        ? 'Seu pedido foi recusado'
        : 'Seu pedido foi cancelado',
      text:
        `Olá, ${client.name}.\n\n` +
        `O prestador ${action} o pedido #${order.id.toString()} para "${order.serviceTitle}".\n` +
        (outcome.refunded
          ? 'O valor pago será estornado pelo mesmo meio de pagamento.\n'
          : '') +
        `Veja os detalhes em ${this.link(`/orders/${order.id.toString()}`)}`,
    }));
  }

  async notifyClientPaymentConfirmed(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: client.email,
      subject: 'Pagamento confirmado: serviço agendado',
      text:
        `Olá, ${client.name}.\n\n` +
        `Recebemos o pagamento do pedido #${order.id.toString()} para "${order.serviceTitle}". ` +
        `O serviço está agendado${this.describeSchedule(order, 'para')}.\n` +
        `Acompanhe em ${this.link(`/orders/${order.id.toString()}`)}`,
    }));
  }

  async notifyClientProviderOnTheWay(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: client.email,
      subject: 'O prestador está a caminho',
      text:
        `Olá, ${client.name}.\n\n` +
        `O prestador do pedido #${order.id.toString()} ("${order.serviceTitle}") está a caminho.\n` +
        `Acompanhe em ${this.link(`/orders/${order.id.toString()}`)}`,
    }));
  }

  async notifyClientServiceFinished(
    client: Recipient,
    order: OrderNotification,
  ): Promise<void> {
    await this.sendSafely(() => ({
      to: client.email,
      subject: 'Serviço finalizado: confirme a conclusão',
      text:
        `Olá, ${client.name}.\n\n` +
        `O prestador informou a conclusão do pedido #${order.id.toString()} ("${order.serviceTitle}").\n` +
        `Confirme a conclusão ou reporte um problema em ` +
        this.link(`/orders/${order.id.toString()}/confirm`),
    }));
  }

  /**
   * Nunca rejeita: a montagem e a entrega ficam protegidas, permitindo que os
   * handlers disparem o aviso após o commit sem aguardar o SMTP.
   */
  private async sendSafely(build: () => EmailMessage): Promise<void> {
    let subject = 'desconhecida';
    try {
      const message = build();
      subject = message.subject;
      await this.transport.send(message);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar notificação "${subject}": ${(error as Error).message}`,
      );
    }
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
