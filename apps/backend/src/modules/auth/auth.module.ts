import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';

import { AuthTokenService } from './auth-token.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { AuthCommands } from './commands';
import { AuthQueries } from './queries';
import { ProviderHomeService } from './provider-home.service';
import { ConfigModule } from '../../config/config.module';

@Module({
  controllers: [AuthController],
  providers: [
    AuthTokenService,
    ProviderHomeService,
    ...AuthCommands,
    ...AuthQueries,
  ],
  imports: [
    ConfigModule,
    forwardRef(() => UserModule),
    PrismaModule,
    CqrsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
      }),
    }),
  ],
  exports: [AuthTokenService],
})
export class AuthModule {}
