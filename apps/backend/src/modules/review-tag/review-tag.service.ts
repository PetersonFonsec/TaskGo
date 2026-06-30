import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewTagService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const tags = await this.prisma.reviewTag.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    return tags.map((tag) => ({ ...tag, id: tag.id.toString() }));
  }
}
