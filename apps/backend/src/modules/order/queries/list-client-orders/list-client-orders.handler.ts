import { orderPaymentSelect } from '../../../payments/mappers/order-payment.select';
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
        payment: { select: orderPaymentSelect },
        addressSnap: true,
        review: true,
        orderTimeline: {
          where: { event: { in: ['ACCEPTED', 'CANCELED', 'EXPIRED'] } },
          select: { event: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });
    return orders.map(({ orderTimeline, ...order }) => ({
      ...order,
      canceledAt:
        orderTimeline.find(
          ({ event }) => event === 'CANCELED' || event === 'EXPIRED',
        )?.createdAt ?? null,
      expiresAt: this.expiration.expiresAt({
        ...order,
        acceptedAt:
          orderTimeline.find(({ event }) => event === 'ACCEPTED')?.createdAt ??
          null,
      }),
    }));
  }
}
