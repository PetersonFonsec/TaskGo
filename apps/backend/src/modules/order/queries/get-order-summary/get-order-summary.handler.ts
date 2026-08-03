import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { GetOrderSummaryQuery } from './get-order-summary.query';

@QueryHandler(GetOrderSummaryQuery)
export class GetOrderSummaryHandler
  implements IQueryHandler<GetOrderSummaryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetOrderSummaryQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { client: true, addressSnap: true, service: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      id: order.id,
      status: order.status,
      finalPrice: order.finalPrice,
      client: order.client,
      service: order.service,
    };
  }
}
