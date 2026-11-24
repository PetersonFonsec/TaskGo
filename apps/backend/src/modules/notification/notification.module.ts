import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';
import { NotificationService } from './notification.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationsController } from './notifications.controller';

/** O EmailTransport vem do EmailModule, global e importado no AppModule. */
@Module({
  imports: [PushModule],
  controllers: [NotificationsController],
  providers: [NotificationService, InAppNotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
