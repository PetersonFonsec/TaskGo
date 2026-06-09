import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';

@Module({
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
})
export class FeatureFlagModule {}
