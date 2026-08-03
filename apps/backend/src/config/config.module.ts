import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import appConfig from './app.config';
import authConfig from './auth.config';
import paymentConfig from './payment.config';
import { validateEnvironment } from './environment.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      cache: true,
      envFilePath: ['apps/backend/.env', '.env'],
      expandVariables: true,
      isGlobal: true,
      load: [appConfig, authConfig, paymentConfig],
      validate: validateEnvironment,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
