import { providerCoverageWhere } from '../../coverage';
import {
  publicProviderSelect,
  toPublicProvider,
} from '../../mappers/public-provider.mapper';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetProvidersByCategoryQuery } from './get-providers-by-category.query';

@QueryHandler(GetProvidersByCategoryQuery)
export class GetProvidersByCategoryHandler
  implements IQueryHandler<GetProvidersByCategoryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ slug, coverage }: GetProvidersByCategoryQuery) {
    if (!slug) return [];
    const areaWhere = await providerCoverageWhere(this.prisma, coverage);
    const providers = await this.prisma.provider.findMany({
      where: {
        ...areaWhere,
        status: 'APPROVED',
        services: { some: { category: slug, status: 'ATIVO' } },
      },
      select: {
        ...publicProviderSelect,
        services: {
          ...publicProviderSelect.services,
          where: { category: slug, status: 'ATIVO' },
        },
      },
    });
    return providers.map((provider) => ({
      ...toPublicProvider(provider),
      services: provider.services.map((service) => ({
        ...service,
        basePrice: Number(service.basePrice),
      })),
    }));
  }
}
