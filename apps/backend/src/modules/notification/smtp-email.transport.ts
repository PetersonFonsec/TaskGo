import * as nodemailer from 'nodemailer';

import { EmailMessage, EmailTransport } from './email-transport';

/** Alternativa ao Resend, útil para testes locais com Mailpit/MailHog. */
export class SmtpEmailTransport extends EmailTransport {
  readonly configured = true;

  constructor(
    private readonly smtpUrl: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const transport = nodemailer.createTransport({
      url: this.smtpUrl,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    try {
      await transport.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } finally {
      transport.close();
    }
  }
}
