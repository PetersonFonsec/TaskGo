import { forwardRef, Module } from '@nestjs/common';

import { ProviderController } from './provider.controller';
import { ProviderService } from './provider.service';

import { ServicesModule } from '../services/services.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => ServicesModule),
  ],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
