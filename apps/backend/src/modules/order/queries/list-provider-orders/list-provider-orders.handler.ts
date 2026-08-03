import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ListProviderOrdersQuery } from './list-provider-orders.query';

@QueryHandler(ListProviderOrdersQuery)
export class ListProviderOrdersHandler
  implements IQueryHandler<ListProviderOrdersQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ providerId }: ListProviderOrdersQuery) {
    return this.prisma.order.findMany({
      where: { service: { is: { providerId } } },
      orderBy: { requestedAt: 'desc' },
      include: {
        client: true,
        service: { include: { provider: { include: { user: true } } } },
        payment: true,
        addressSnap: true,
        review: true,
      },
    });
  }
}
