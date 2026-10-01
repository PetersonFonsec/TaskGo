import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';

import { AdminAuthModule } from '../modules/admin/auth/admin-auth.module';

@Module({
  imports: [AdminAuthModule],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
})
export class FeatureFlagModule {}
