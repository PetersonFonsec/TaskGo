import { orderPaymentSelect } from '../../../payments/mappers/order-payment.select';
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
      },
    });
  }
}
