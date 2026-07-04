import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Public } from '../../../shared/decorators/public.decorator';
import { buildRequestAuditContext } from '../../../shared/http/request-correlation.middleware';
import { AdminCapability } from '../authorization/admin-permissions';
import { AdminPermissions } from '../authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { ADMIN_ACTOR_KEY, AdminRequest } from '../auth/admin-actor';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { CreateAdminInvitationDto } from './dto/create-admin-invitation.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Get()
  list(@Query() query: AdminUsersQueryDto) {
    return this.adminUsersService.list(query);
  }

  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Post('invitations')
  invite(@Body() body: CreateAdminInvitationDto, @Req() request: AdminRequest) {
    return this.adminUsersService.invite(
      body,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Patch(':id/role')
  changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminRoleDto,
    @Req() request: AdminRequest,
  ) {
    return this.adminUsersService.changeRole(
      BigInt(id),
      body.role,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) {
    return this.adminUsersService.reactivate(
      BigInt(id),
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ManageAdministrativeUsers)
  @Post(':id/deactivate')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
  ) {
    return this.adminUsersService.deactivate(
      BigInt(id),
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }
}
