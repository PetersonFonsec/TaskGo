import {
  publicProviderSelect,
  toPublicProvider,
} from '../../mappers/public-provider.mapper';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetProviderQuery } from './get-provider.query';

@QueryHandler(GetProviderQuery)
export class GetProviderHandler implements IQueryHandler<GetProviderQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetProviderQuery) {
    const provider = await this.prisma.provider.findUnique({
      where: {
        id,
        status: 'APPROVED',
        services: { some: { status: 'ATIVO' } },
      },
      select: {
        ...publicProviderSelect,
        createdAt: true,
        reviews: {
          take: 20,
          orderBy: { reviewedAt: 'desc' },
          select: { id: true, rating: true, comment: true, reviewedAt: true },
        },
      },
    });
    return provider ? toPublicProvider(provider) : null;
  }
}
