import * as nodemailer from 'nodemailer';

import { EmailMessage, EmailTransport } from './email-transport';

export class SmtpEmailTransport extends EmailTransport {
  constructor(
    private readonly smtpUrl: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const transport = nodemailer.createTransport(this.smtpUrl);
    try {
      await transport.sendMail({ from: this.from, ...message });
    } finally {
      transport.close();
    }
  }
}
