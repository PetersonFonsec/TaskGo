import { providerCoverageWhere } from '../../coverage';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';

import Mediator from '../../../../shared/events/mediator';
import { FeatureFlagService } from '../../../../shared/services/feature-flag.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  publicProviderSelect,
  toPublicProvider,
} from '../../mappers/public-provider.mapper';
import { GetProvidersByCategoryQuery } from './get-providers-by-category.query';
import { filterAndOrderProviders } from '../../provider-search';

@QueryHandler(GetProvidersByCategoryQuery)
export class GetProvidersByCategoryHandler
  implements IQueryHandler<GetProvidersByCategoryQuery>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediator: Mediator,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async execute({
    slug,
    coverage,
    filters,
    onlyFavorites,
    authenticatedUserId,
  }: GetProvidersByCategoryQuery) {
    if (!slug) return [];
    const areaWhere = await providerCoverageWhere(this.prisma, coverage);
    const where = {
      ...areaWhere,
      status: 'APPROVED' as const,
      services: { some: { category: slug, status: 'ATIVO' as const } },
    };
    let providers: Prisma.ProviderGetPayload<{
      select: typeof publicProviderSelect;
    }>[];
    let clientId: bigint | undefined;
    if (onlyFavorites) {
      if (!this.featureFlagService.isFavoritesMvpEnabled()) {
        throw new NotFoundException('Favorites feature disabled');
      }
      if (!authenticatedUserId) {
        throw new UnauthorizedException(
          'Authenticated client required for favorites filter',
        );
      }
      clientId = BigInt(authenticatedUserId);
      const favorites = await this.prisma.clientFavorite.findMany({
        where: { clientId, provider: where },
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: {
              ...publicProviderSelect,
              services: {
                ...publicProviderSelect.services,
                where: { category: slug, status: 'ATIVO' },
              },
            },
          },
        },
      });
      providers = favorites.map(({ provider }) => provider);
      await this.mediator.publish('favorites.view', {
        clientId,
        resultCount: providers.length,
        timestamp: new Date().toISOString(),
      });
    } else {
      providers = await this.prisma.provider.findMany({
        where,
        select: {
          ...publicProviderSelect,
          services: {
            ...publicProviderSelect.services,
            where: { category: slug, status: 'ATIVO' },
          },
        },
      });
    }
    const results = filterAndOrderProviders(
      providers,
      coverage,
      filters,
      slug,
    ).map((provider) => ({
      ...toPublicProvider(provider),
      services: provider.services.map((service) => ({
        ...service,
        basePrice: Number(service.basePrice),
      })),
    }));
    if (clientId) {
      await this.mediator.publish('favorites.searchFilter.used', {
        clientId,
        resultCount: results.length,
        timestamp: new Date().toISOString(),
      });
    }
    return results;
  }
}
