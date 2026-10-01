import { Module } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../user/events/user-created.event';
import { NotificationEmailService } from './notification-email.service';

@EventsHandler(UserCreatedEvent)
export class WelcomeEmailHandler implements IEventHandler<UserCreatedEvent> {
  constructor(private readonly email: NotificationEmailService) {}

  async handle(event: UserCreatedEvent) {
    await this.email.welcome(event.user.id!);
  }
}

@Module({
  providers: [NotificationEmailService, WelcomeEmailHandler],
  exports: [NotificationEmailService],
})
export class NotificationsModule {}
