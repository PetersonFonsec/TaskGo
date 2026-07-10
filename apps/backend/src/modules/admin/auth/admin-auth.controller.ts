import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

import { Public } from '../../../shared/decorators/public.decorator';
import { buildRequestAuditContext } from '../../../shared/http/request-correlation.middleware';
import { ADMIN_ACTOR_KEY, AdminRequest } from './admin-actor';
import { AdminPublic } from '../authorization/admin-public.decorator';
import { AdminRoles } from '../authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';
import { AdminAuthLoginDto } from './dto/admin-auth-login.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import type { AdminAuthSession, AdminMeResponse } from '@taskgo/shared';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  @AdminPublic()
  @Post('login')
  login(@Body() body: AdminAuthLoginDto): Promise<AdminAuthSession> {
    return this.authService.login(body.email, body.password);
  }

  @AdminRoles(
    AdminRole.ADMINISTRATOR,
    AdminRole.SUPPORT,
    AdminRole.FINANCE,
    AdminRole.MODERATOR,
  )
  @Get('me')
  me(@Req() request: AdminRequest): AdminMeResponse {
    const actor = request[ADMIN_ACTOR_KEY];

    return {
      operator: this.authService.toResponse(actor!),
    };
  }

  @AdminRoles(
    AdminRole.ADMINISTRATOR,
    AdminRole.SUPPORT,
    AdminRole.FINANCE,
    AdminRole.MODERATOR,
  )
  @Post('change-password')
  changePassword(
    @Body() body: AdminChangePasswordDto,
    @Req() request: AdminRequest,
  ) {
    return this.authService.changePassword(
      request[ADMIN_ACTOR_KEY]!,
      body,
      buildRequestAuditContext(request),
    );
  }
}
