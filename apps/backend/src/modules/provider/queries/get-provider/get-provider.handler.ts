import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetProviderQuery } from './get-provider.query';

@QueryHandler(GetProviderQuery)
export class GetProviderHandler implements IQueryHandler<GetProviderQuery> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ id }: GetProviderQuery) {
    return this.prisma.provider.findUnique({
      where: { id },
      include: {
        user: true,
        locations: true,
        reviews: true,
        serviceAreas: true,
        services: true,
      },
    });
  }
}
