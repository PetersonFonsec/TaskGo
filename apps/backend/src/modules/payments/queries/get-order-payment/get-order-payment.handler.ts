import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { toPaymentResponse } from '../../mappers/payment-response.mapper';
import { GetOrderPaymentQuery } from './get-order-payment.query';

@QueryHandler(GetOrderPaymentQuery)
export class GetOrderPaymentHandler
  implements IQueryHandler<GetOrderPaymentQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ orderId, clientId }: GetOrderPaymentQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { clientId: true, payment: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.clientId !== clientId) {
      throw new ForbiddenException('Pagamento indisponível para este usuário');
    }
    if (!order.payment || order.payment.status === PaymentStatus.CREATED) {
      throw new NotFoundException('Pagamento ainda não iniciado');
    }
    return toPaymentResponse(order.payment);
  }
}
