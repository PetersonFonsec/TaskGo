import { Injectable, Logger } from '@nestjs/common';

import { EmailMessage, EmailTransport } from './email-transport';

export interface Recipient {
  email: string;
  name: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly transport: EmailTransport) {}

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
    await this.sendSafely({
      to: provider.email,
      subject: 'Você recebeu uma nova avaliação',
      text:
        `Olá, ${provider.name}.\n\n` +
        `O cliente do pedido #${orderId.toString()} avaliou seu atendimento com nota ${rating} de 5.`,
    });
  }

  async notifyProviderOrderConfirmed(
    provider: Recipient,
    orderId: bigint,
  ): Promise<void> {
    await this.sendSafely({
      to: provider.email,
      subject: 'Cliente confirmou a conclusão do serviço',
      text:
        `Olá, ${provider.name}.\n\n` +
        `O cliente confirmou a conclusão do pedido #${orderId.toString()} e o pagamento foi registrado.`,
    });
  }

  private async sendSafely(message: EmailMessage): Promise<void> {
    try {
      await this.transport.send(message);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar notificação "${message.subject}": ${(error as Error).message}`,
      );
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}
