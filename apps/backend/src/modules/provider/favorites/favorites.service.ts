import { Injectable } from '@nestjs/common';
import { PrismaService } from '@PrismaDir/prisma.service';
import Mediator from '@taskgo/backend/shared/events/mediator';

@Injectable()
export class FavoritesService {
  constructor(
    private prisma: PrismaService,
    private mediator: Mediator,
  ) {}

  private getClientId(
    client: number | string | bigint | { id?: number | string | bigint },
  ) {
    const clientId =
      typeof client === 'object' && client !== null ? client.id : client;
    return BigInt(clientId as number | string | bigint);
  }

  async addFavorite(
    clientId: number | string | bigint | { id?: number | string | bigint },
    providerId: number,
  ) {
    const normalizedClientId = this.getClientId(clientId);
    const favorite = await this.prisma.clientFavorite.upsert({
      where: {
        clientId_providerId: {
          clientId: normalizedClientId,
          providerId,
        },
      },
      update: {},
      create: {
        clientId: normalizedClientId,
        providerId,
      },
    });

    await this.mediator.publish('favorite.add', {
      clientId: normalizedClientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
      createdAt: favorite.createdAt,
    });

    return favorite;
  }

  async removeFavorite(
    clientId: number | string | bigint | { id?: number | string | bigint },
    providerId: number,
  ) {
    const normalizedClientId = this.getClientId(clientId);
    const favorite = await this.prisma.clientFavorite.findUnique({
      where: {
        clientId_providerId: {
          clientId: normalizedClientId,
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
      clientId: normalizedClientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
    });

    return favorite;
  }

  async listFavorites(
    clientId: any,
    paging?: { skip?: number; take?: number },
  ) {
    const normalizedClientId = this.getClientId(clientId);
    const skip = paging?.skip ?? 0;
    const take = paging?.take ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.clientFavorite.findMany({
        where: {
          clientId: normalizedClientId,
        },
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
      this.prisma.clientFavorite.count({
        where: {
          clientId: normalizedClientId,
        },
      }),
    ]);

    await this.mediator.publish('favorites.view', {
      clientId: normalizedClientId,
      resultCount: total,
      timestamp: new Date().toISOString(),
    });

    return { items, total };
  }
}
