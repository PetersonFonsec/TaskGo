import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentService } from '../../payment.service';
import { PaymentStatus } from '@prisma/client';
import { CreateOrderPaymentCommand } from '../../commands/create-order-payment/create-order-payment.command';

import { PrismaService } from '../../../../prisma/prisma.service';
import { toPaymentResponse } from '../../mappers/payment-response.mapper';
import { GetOrderPaymentQuery } from './get-order-payment.query';

@QueryHandler(GetOrderPaymentQuery)
export class GetOrderPaymentHandler
  implements IQueryHandler<GetOrderPaymentQuery>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly commands: CommandBus,
  ) {}

  async execute({ orderId, clientId }: GetOrderPaymentQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { clientId: true, payment: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.clientId !== clientId) {
      throw new ForbiddenException('Pagamento indisponível para este usuário');
    }
    if (order.payment?.status === PaymentStatus.CREATED) {
      const attempt = await this.prisma.paymentAttempt.findUnique({
        where: { orderId },
      });
      if (attempt?.provider === 'ABACATEPAY' && attempt.submittedAt)
        return this.commands.execute(
          new CreateOrderPaymentCommand(orderId, clientId, {
            method: attempt.method,
          }),
        );
    }
    if (!order.payment || order.payment.status === PaymentStatus.CREATED) {
      throw new NotFoundException('Pagamento ainda não iniciado');
    }
    return toPaymentResponse(
      await this.payments.reconcilePayment(order.payment.id),
    );
  }
}
