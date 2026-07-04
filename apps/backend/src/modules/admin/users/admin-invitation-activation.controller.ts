import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { Public } from '../../../shared/decorators/public.decorator';
import { buildRequestAuditContext } from '../../../shared/http/request-correlation.middleware';
import { AdminPublic } from '../authorization/admin-public.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminRequest } from '../auth/admin-actor';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminUsersService } from './admin-users.service';
import { ActivateAdminInvitationDto } from './dto/create-admin-invitation.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/auth')
export class AdminInvitationActivationController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @AdminPublic()
  @Post('activate')
  activate(@Body() body: ActivateAdminInvitationDto, @Req() request: AdminRequest) {
    return this.adminUsersService.activateInvitation(
      body,
      buildRequestAuditContext(request),
    );
  }
}
