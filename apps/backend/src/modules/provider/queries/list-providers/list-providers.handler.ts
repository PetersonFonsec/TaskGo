import { providerCoverageWhere } from '../../coverage';
import {
  publicProviderSelect,
  toPublicProvider,
} from '../../mappers/public-provider.mapper';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import Mediator from '../../../../shared/events/mediator';
import { FeatureFlagService } from '../../../../shared/services/feature-flag.service';
import { ListProvidersQuery } from './list-providers.query';
import { PrismaService } from '../../../../prisma/prisma.service';

@QueryHandler(ListProvidersQuery)
export class ListProvidersHandler implements IQueryHandler<ListProvidersQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediator: Mediator,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async execute({
    onlyFavorites,
    authenticatedUserId,
    coverage,
  }: ListProvidersQuery) {
    const areaWhere = await providerCoverageWhere(this.prisma, coverage);
    if (!onlyFavorites) {
      const providers = await this.prisma.provider.findMany({
        where: {
          ...areaWhere,
          status: 'APPROVED',
          services: { some: { status: 'ATIVO' } },
        },
        select: publicProviderSelect,
      });
      return providers.map(toPublicProvider);
    }
    if (!this.featureFlagService.isFavoritesMvpEnabled()) {
      throw new NotFoundException('Favorites feature disabled');
    }
    if (!authenticatedUserId) {
      throw new UnauthorizedException(
        'Authenticated client required for favorites filter',
      );
    }

    const clientId = BigInt(authenticatedUserId);
    const favorites = await this.prisma.clientFavorite.findMany({
      where: {
        clientId,
        provider: {
          ...areaWhere,
          status: 'APPROVED',
          services: { some: { status: 'ATIVO' } },
        },
      },
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: { select: publicProviderSelect },
      },
    });
    await this.mediator.publish('favorites.view', {
      clientId,
      resultCount: favorites.length,
      timestamp: new Date().toISOString(),
    });
    const providers = favorites.map((favorite) =>
      toPublicProvider(favorite.provider),
    );
    await this.mediator.publish('favorites.searchFilter.used', {
      clientId,
      resultCount: providers.length,
      timestamp: new Date().toISOString(),
    });
    return providers;
  }
}
