import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthTokenService } from './admin-auth-token.service';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';

@Module({
  controllers: [AdminAuthController],
  imports: [
    PrismaModule,
    AdminAuditModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    AdminAuthGuard,
    AdminRolesGuard,
    AdminAuthService,
    AdminAuthTokenService,
  ],
  exports: [
    AdminAuthGuard,
    AdminRolesGuard,
    AdminAuthService,
    AdminAuthTokenService,
  ],
})
export class AdminAuthModule {}
