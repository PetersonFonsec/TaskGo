import { Injectable, Logger } from '@nestjs/common';

export interface AdminInvitationDeliveryInput {
  email: string;
  name: string;
  token: string;
  activationUrl: string;
  expiresAt: Date;
}

@Injectable()
export class AdminInvitationDeliveryService {
  private readonly logger = new Logger(AdminInvitationDeliveryService.name);

  async deliver(input: AdminInvitationDeliveryInput): Promise<void> {
    this.logger.log(`Administrative invitation prepared for ${input.email}`);
  }
}
