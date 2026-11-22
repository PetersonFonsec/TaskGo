import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmailTransport } from './email-transport';
import { LogEmailTransport } from './log-email.transport';
import { PushModule } from '../push/push.module';
import { NotificationService } from './notification.service';
import { SmtpEmailTransport } from './smtp-email.transport';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PushModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: EmailTransport,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailTransport => {
        const smtpUrl = config.get<string>('SMTP_URL');
        const from = config.get<string>('MAIL_FROM');
        if (smtpUrl && from) return new SmtpEmailTransport(smtpUrl, from);
        return new LogEmailTransport(config.get('NODE_ENV') !== 'production');
      },
    },
    NotificationService,
    InAppNotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
