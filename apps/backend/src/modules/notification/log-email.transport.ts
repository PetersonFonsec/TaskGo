import { Logger } from '@nestjs/common';

import { EmailMessage, EmailTransport } from './email-transport';

/**
 * Transporte usado quando não há SMTP configurado. Fora de produção o corpo
 * é registrado para permitir testar fluxos locais (códigos, links de convite).
 */
export class LogEmailTransport extends EmailTransport {
  private readonly logger = new Logger(LogEmailTransport.name);

  constructor(private readonly includeBody: boolean) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const header = `E-mail para ${message.to}: ${message.subject}`;
    this.logger.log(this.includeBody ? `${header}\n${message.text}` : header);
  }
}
