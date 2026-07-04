import { Module } from '@nestjs/common';

import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminAuditModule } from './audit/admin-audit.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminProvidersModule } from './providers/admin-providers.module';
import { AdminUsersModule } from './users/admin-users.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminAuditModule,
    AdminUsersModule,
    AdminProvidersModule,
  ],
  controllers: [AdminAuditController],
})
export class AdminModule {}
