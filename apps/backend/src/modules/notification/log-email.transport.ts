import { Logger } from '@nestjs/common';

import { EmailMessage, EmailTransport } from './email-transport';

/**
 * Transporte usado quando não há provedor configurado. Fora de produção o corpo
 * é registrado para permitir testar fluxos locais (códigos, links de convite).
 */
export class LogEmailTransport extends EmailTransport {
  readonly configured = false;
  private readonly logger = new Logger(LogEmailTransport.name);

  constructor(private readonly includeBody: boolean) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const header = `E-mail para ${message.to}: ${message.subject}`;
    this.logger.log(
      this.includeBody
        ? `${header}\n${message.text}`
        : 'E-mail sem provedor configurado (RESEND_API_KEY ou SMTP_URL)',
    );
  }
}
