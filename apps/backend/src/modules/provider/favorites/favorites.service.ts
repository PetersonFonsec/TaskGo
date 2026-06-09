import { Injectable } from '@nestjs/common';
import { PrismaService } from '@PrismaDir/prisma.service';
import Mediator from '@taskgo/backend/shared/events/mediator';

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private mediator: Mediator
  ) { }

  async addFavorite(clientId: number, providerId: number) {
    const favorite = await this.prisma.clientFavorite.upsert({
      where: {
        clientId_providerId: {
          clientId,
          providerId,
        },
      },
      update: {},
      create: {
        clientId,
        providerId,
      },
    });

    await this.mediator.publish('favorite.add', {
      clientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
      createdAt: favorite.createdAt,
    });

    return favorite;
  }

  async removeFavorite(clientId: number, providerId: number) {
    const favorite = await this.prisma.clientFavorite.findUnique({
      where: {
        clientId_providerId: {
          clientId,
          providerId,
        },
      },
    });

    if (!favorite) {
      return null;
    }

    await this.prisma.clientFavorite.delete({
      where: {
        id: favorite.id,
      },
    });

    await this.mediator.publish('favorite.remove', {
      clientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
    });

    return favorite;
  }

  async listFavorites(clientId: number, paging?: { skip?: number; take?: number }) {
    const skip = paging?.skip ?? 0;
    const take = paging?.take ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.clientFavorite.findMany({
        where: { clientId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            include: {
              user: true,
              services: true,
            },
          },
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
