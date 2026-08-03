import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetProvidersByCategoryQuery } from './get-providers-by-category.query';

@QueryHandler(GetProvidersByCategoryQuery)
export class GetProvidersByCategoryHandler
  implements IQueryHandler<GetProvidersByCategoryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ slug }: GetProvidersByCategoryQuery) {
    if (!slug) return [];
    const providers = await this.prisma.provider.findMany({
      where: {
        services: { some: { category: slug, status: 'ATIVO' } },
      },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: { where: { category: slug, status: 'ATIVO' } },
      },
    });
    return providers.map((provider) => ({
      ...provider,
      services: provider.services.map((service) => ({
        ...service,
        basePrice: Number(service.basePrice),
      })),
    }));
  }
}
