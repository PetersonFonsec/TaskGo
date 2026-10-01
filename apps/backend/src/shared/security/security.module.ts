import { Global, Module } from '@nestjs/common';
import { SecurityRateLimitGuard } from './security-rate-limit.guard';
import { AdminMfaService } from './admin-mfa.service';
import { SecurityMaintenanceService } from './security-maintenance.service';
@Global()
@Module({
  providers: [
    SecurityRateLimitGuard,
    AdminMfaService,
    SecurityMaintenanceService,
  ],
  exports: [SecurityRateLimitGuard, AdminMfaService],
})
export class SecurityModule {}
