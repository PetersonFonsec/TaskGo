import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ConfigModule } from '../../config/config.module';
import { EmailTransport } from './email-transport';
import { LogEmailTransport } from './log-email.transport';
import { ResendEmailTransport } from './resend-email.transport';
import { SmtpEmailTransport } from './smtp-email.transport';

/**
 * Escolhe o canal de e-mail uma única vez para toda a API:
 * 1. Resend (RESEND_API_KEY + MAIL_FROM), o provedor de homologação e produção;
 * 2. SMTP (SMTP_URL + MAIL_FROM), para testes locais com Mailpit/MailHog;
 * 3. apenas log, quando nenhum dos dois está configurado.
 */
export function createEmailTransport(config: ConfigService): EmailTransport {
  const from = config.get<string>('MAIL_FROM')?.trim();
  const resendKey = config.get<string>('RESEND_API_KEY')?.trim();
  const smtpUrl = config.get<string>('SMTP_URL')?.trim();
  const logger = new Logger('EmailModule');

  if (resendKey && from) {
    logger.log('E-mails transacionais enviados pelo Resend');
    return new ResendEmailTransport(resendKey, from, {
      replyTo: config.get<string>('MAIL_REPLY_TO')?.trim() || undefined,
    });
  }
  if (smtpUrl && from) {
    logger.log('E-mails transacionais enviados por SMTP');
    return new SmtpEmailTransport(smtpUrl, from);
  }
  logger.warn(
    'Nenhum provedor de e-mail configurado (RESEND_API_KEY ou SMTP_URL, com MAIL_FROM): os e-mails só serão registrados no log',
  );
  return new LogEmailTransport(config.get('NODE_ENV') !== 'production');
}

/**
 * Global para o AppModule, mas também importado pelos módulos que enviam
 * e-mail, para que montagens parciais (testes de integração) resolvam o transporte.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EmailTransport,
      inject: [ConfigService],
      useFactory: createEmailTransport,
    },
  ],
  exports: [EmailTransport],
})
export class EmailModule {}
