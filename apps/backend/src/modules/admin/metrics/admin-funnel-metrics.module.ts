import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminFunnelMetricsController } from './admin-funnel-metrics.controller';
import { AdminFunnelMetricsService } from './admin-funnel-metrics.service';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminFunnelMetricsController],
  providers: [AdminFunnelMetricsService],
})
export class AdminFunnelMetricsModule {}
