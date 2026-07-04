import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminInvitationDeliveryService } from './invitations/admin-invitation-delivery.service';
import { AdminInvitationActivationController } from './admin-invitation-activation.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [PrismaModule, AdminAuditModule, AdminAuthModule],
  controllers: [AdminUsersController, AdminInvitationActivationController],
  providers: [AdminUsersService, AdminInvitationDeliveryService, AdminRolesGuard],
  exports: [AdminUsersService, AdminInvitationDeliveryService],
})
export class AdminUsersModule {}
