import { Module } from '@nestjs/common';

import { ReviewTagController } from './review-tag.controller';
import { ReviewTagService } from './review-tag.service';

@Module({
  controllers: [ReviewTagController],
  providers: [ReviewTagService],
})
export class ReviewTagModule {}
