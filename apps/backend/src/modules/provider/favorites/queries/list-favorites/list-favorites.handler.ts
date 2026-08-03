import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../../prisma/prisma.service';
import Mediator from '../../../../../shared/events/mediator';
import { ListFavoritesQuery } from './list-favorites.query';

@QueryHandler(ListFavoritesQuery)
export class ListFavoritesHandler implements IQueryHandler<ListFavoritesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediator: Mediator,
  ) {}

  async execute({ clientId, paging }: ListFavoritesQuery) {
    const [items, total] = await Promise.all([
      this.prisma.clientFavorite.findMany({
        where: { clientId },
        skip: paging.skip ?? 0,
        take: paging.take ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: { include: { user: true, services: true } },
        },
      }),
      this.prisma.clientFavorite.count({ where: { clientId } }),
    ]);
    await this.mediator.publish('favorites.view', {
      clientId,
      resultCount: total,
      timestamp: new Date().toISOString(),
    });
    return { items, total };
  }
}
