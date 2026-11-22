import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { User } from '../../shared/decorators/user.decorator';
import type { AuthenticatedIdentity } from '../../shared/auth/authenticated-identity';
import { ParseBigIntPipe } from '../../shared/pipes/parse-bigint.pipe';
import { InAppNotificationService } from './in-app-notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: InAppNotificationService) {}

  @Get()
  list(
    @User() user: AuthenticatedIdentity,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.notifications.list(
      BigInt(user.id),
      this.parseNonNegativeInteger(skip, 0),
      this.parsePositiveInteger(take, 25),
    );
  }

  @Patch('read-all')
  async markAllRead(@User() user: AuthenticatedIdentity) {
    const updatedCount = await this.notifications.markAllRead(BigInt(user.id));
    return { updatedCount, unreadCount: 0 };
  }

  @Patch(':id/read')
  async markRead(
    @User() user: AuthenticatedIdentity,
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    const updated = await this.notifications.markRead(BigInt(user.id), id);
    return { updated, notificationId: id.toString() };
  }

  private parseNonNegativeInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : fallback;
  }
}
