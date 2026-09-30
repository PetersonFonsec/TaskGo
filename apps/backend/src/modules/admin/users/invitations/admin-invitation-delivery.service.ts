import { Injectable } from '@nestjs/common';

import { NotificationService } from '../../../notification/notification.service';

export interface AdminInvitationDeliveryInput {
  email: string;
  name: string;
  token: string;
  activationUrl: string;
  expiresAt: Date;
}

@Injectable()
export class AdminInvitationDeliveryService {
  constructor(private readonly notifications: NotificationService) {}

  async deliver(input: AdminInvitationDeliveryInput): Promise<void> {
    await this.notifications.sendAdminInvitation(
      { email: input.email, name: input.name },
      input.activationUrl,
      input.expiresAt,
    );
  }
}
