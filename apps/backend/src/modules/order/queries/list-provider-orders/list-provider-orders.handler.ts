import { orderPaymentSelect } from '../../../payments/mappers/order-payment.select';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { OrderExpirationPolicy } from '../../expiration/order-expiration.policy';
import { ListProviderOrdersQuery } from './list-provider-orders.query';

@QueryHandler(ListProviderOrdersQuery)
export class ListProviderOrdersHandler
  implements IQueryHandler<ListProviderOrdersQuery>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly expiration: OrderExpirationPolicy,
  ) {}

  async execute({ providerId }: ListProviderOrdersQuery) {
    const orders = await this.prisma.order.findMany({
      where: { service: { is: { providerId } } },
      orderBy: { requestedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, photoUrl: true } },
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
