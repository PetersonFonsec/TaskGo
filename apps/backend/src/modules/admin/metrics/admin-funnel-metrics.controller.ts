import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../shared/decorators/public.decorator';
import { AdminCapability } from '../authorization/admin-permissions';
import { AdminPermissions } from '../authorization/admin-roles.decorator';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminFunnelMetricsService } from './admin-funnel-metrics.service';
import { AdminFunnelMetricsQueryDto } from './dto/admin-funnel-metrics-query.dto';

@Public()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@Controller('admin/metrics/funnel')
export class AdminFunnelMetricsController {
  constructor(private readonly funnelMetrics: AdminFunnelMetricsService) {}

  @AdminPermissions(AdminCapability.ReadFunnelMetrics)
  @Get()
  getFunnel(@Query() query: AdminFunnelMetricsQueryDto) {
    return this.funnelMetrics.getFunnel(query);
  }
}
