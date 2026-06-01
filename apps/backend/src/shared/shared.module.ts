import { Module } from '@nestjs/common';

import { PaginationService } from '../shared/services/pagination/pagination.service';
import Mediator from '../shared/events/mediator';
import { FeatureFlagService } from './services/feature-flag.service';

@Module({
  providers: [Mediator, PaginationService, FeatureFlagService],
  exports: [Mediator, PaginationService, FeatureFlagService],
})
export class SharedModule { }
