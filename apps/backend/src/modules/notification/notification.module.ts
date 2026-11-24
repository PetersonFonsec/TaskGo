import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';
import { EmailModule } from './email.module';
import { NotificationService } from './notification.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [EmailModule, PushModule],
  controllers: [NotificationsController],
  providers: [NotificationService, InAppNotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
