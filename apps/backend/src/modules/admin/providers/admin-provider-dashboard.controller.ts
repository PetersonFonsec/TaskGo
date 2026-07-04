import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../shared/decorators/public.decorator';
import { AdminCapability } from '../authorization/admin-permissions';
import { AdminPermissions } from '../authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminProvidersService } from './admin-providers.service';
import { AdminProviderDashboardQueryDto } from './dto/admin-provider-dashboard-query.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/dashboard/providers')
export class AdminProviderDashboardController {
  constructor(private readonly providersService: AdminProvidersService) {}

  @AdminPermissions(AdminCapability.ReadProviderDashboard)
  @Get()
  getDashboard(@Query() query: AdminProviderDashboardQueryDto) {
    return this.providersService.getDashboard(query);
  }
}
