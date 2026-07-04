import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminProviderDashboardController } from './admin-provider-dashboard.controller';
import { AdminProvidersController } from './admin-providers.controller';
import { AdminProvidersService } from './admin-providers.service';

@Module({
  imports: [PrismaModule, AdminAuthModule, AdminAuditModule],
  controllers: [AdminProvidersController, AdminProviderDashboardController],
  providers: [AdminProvidersService],
  exports: [AdminProvidersService],
})
export class AdminProvidersModule {}
