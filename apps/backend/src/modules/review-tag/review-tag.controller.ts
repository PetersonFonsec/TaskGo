import { Controller, Get } from '@nestjs/common';

import { ReviewTagService } from './review-tag.service';

@Controller('review-tags')
export class ReviewTagController {
  constructor(private readonly reviewTags: ReviewTagService) {}

  @Get()
  findActive() {
    return this.reviewTags.findActive();
  }
}
