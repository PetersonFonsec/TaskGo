import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { OrderExpirationPolicy } from '../../expiration/order-expiration.policy';
import { ListClientOrdersQuery } from './list-client-orders.query';

@QueryHandler(ListClientOrdersQuery)
export class ListClientOrdersHandler
  implements IQueryHandler<ListClientOrdersQuery>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiration: OrderExpirationPolicy,
  ) {}

  async execute({ clientId }: ListClientOrdersQuery) {
    const orders = await this.prisma.order.findMany({
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
        orderTimeline: {
          where: { event: 'ACCEPTED' },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return orders.map(({ orderTimeline, ...order }) => ({
      ...order,
      expiresAt: this.expiration.expiresAt({
        ...order,
        acceptedAt: orderTimeline[0]?.createdAt ?? null,
      }),
    }));
  }
}
