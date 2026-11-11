import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';
import { DevicesController } from './devices.controller';
import { FcmPushTransport } from './fcm-push.transport';
import { LogPushTransport } from './log-push.transport';
import { PushTransport } from './push-transport';
import { PushService } from './push.service';

@Module({
  imports: [PrismaModule],
  controllers: [DevicesController],
  providers: [
    {
      provide: PushTransport,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PushTransport => {
        const raw = config.get<string>('FCM_SERVICE_ACCOUNT');
        if (!raw) return new LogPushTransport();
        try {
          return new FcmPushTransport(
            FcmPushTransport.parseServiceAccount(raw),
          );
        } catch (error) {
          new Logger(PushModule.name).error(
            `FCM_SERVICE_ACCOUNT inválida; push só será registrado em log: ${(error as Error).message}`,
          );
          return new LogPushTransport();
        }
      },
    },
    PushService,
  ],
  exports: [PushService],
})
export class PushModule {}
