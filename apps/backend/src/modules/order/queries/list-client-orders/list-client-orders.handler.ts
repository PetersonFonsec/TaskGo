import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ListClientOrdersQuery } from './list-client-orders.query';

@QueryHandler(ListClientOrdersQuery)
export class ListClientOrdersHandler
  implements IQueryHandler<ListClientOrdersQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ clientId }: ListClientOrdersQuery) {
    return this.prisma.order.findMany({
      where: { clientId },
      orderBy: { requestedAt: 'desc' },
      include: {
        service: {
          include: {
            provider: {
              include: {
                user: { select: { id: true, name: true, photoUrl: true } },
              },
            },
          },
        },
        payment: true,
        addressSnap: true,
        review: true,
      },
    });
  }
}
