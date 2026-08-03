import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuditModule } from '../audit/admin-audit.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthTokenService } from './admin-auth-token.service';
import { AdminRolesGuard } from '../authorization/admin-roles.guard';
import { ConfigModule } from '../../../config/config.module';

@Module({
  controllers: [AdminAuthController],
  imports: [
    ConfigModule,
    PrismaModule,
    AdminAuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
      }),
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
