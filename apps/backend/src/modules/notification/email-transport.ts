export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Canal de entrega de e-mails. A implementação é escolhida pelo
 * NotificationModule conforme a configuração de SMTP.
 */
export abstract class EmailTransport {
  abstract send(message: EmailMessage): Promise<void>;
}
