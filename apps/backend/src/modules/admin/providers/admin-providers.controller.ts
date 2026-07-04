import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { AdminProvidersService } from './admin-providers.service';
import { AdminProviderQueryDto } from './dto/admin-provider-query.dto';
import { ProviderDecisionReasonDto } from './dto/provider-decision-command.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly providersService: AdminProvidersService) {}

  @AdminPermissions(AdminCapability.ReadProviders)
  @Get()
  list(@Query() query: AdminProviderQueryDto) {
    return this.providersService.list(query);
  }

  @AdminPermissions(AdminCapability.ReadProviders)
  @Get(':id')
  getDetails(@Param('id') id: string) {
    return this.providersService.getDetails(id);
  }

  @AdminPermissions(AdminCapability.ReadProviders)
  @Get(':id/history')
  getHistory(@Param('id') id: string, @Query() query: AdminProviderQueryDto) {
    return this.providersService.getHistory(id, query);
  }

  @AdminPermissions(AdminCapability.ExecuteProviderDecisions)
  @HttpCode(200)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.providersService.approve(
      id,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ExecuteProviderDecisions)
  @HttpCode(200)
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: ProviderDecisionReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.providersService.reject(
      id,
      body,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ExecuteProviderDecisions)
  @HttpCode(200)
  @Post(':id/block')
  block(
    @Param('id') id: string,
    @Body() body: ProviderDecisionReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.providersService.block(
      id,
      body,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }

  @AdminPermissions(AdminCapability.ExecuteProviderDecisions)
  @HttpCode(200)
  @Post(':id/unblock')
  unblock(
    @Param('id') id: string,
    @Body() body: ProviderDecisionReasonDto,
    @Req() request: AdminRequest,
  ) {
    return this.providersService.unblock(
      id,
      body,
      request[ADMIN_ACTOR_KEY]!,
      buildRequestAuditContext(request),
    );
  }
}
