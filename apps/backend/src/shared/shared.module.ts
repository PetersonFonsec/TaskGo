import { Module } from '@nestjs/common';

import Mediator from '../shared/events/mediator';
import { FeatureFlagService } from './services/feature-flag.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [Mediator, FeatureFlagService],
  exports: [Mediator, FeatureFlagService],
})
export class SharedModule {}
