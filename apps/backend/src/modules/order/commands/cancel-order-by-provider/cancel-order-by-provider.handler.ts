import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentService } from '../../../payments/payment.service';
import { cancellationDescription } from '../../cancellation-reasons';
import { CancelOrderByProviderCommand } from './cancel-order-by-provider.command';

@CommandHandler(CancelOrderByProviderCommand)
export class CancelOrderByProviderHandler
  implements ICommandHandler<CancelOrderByProviderCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
  ) {}

  async execute({
    orderId,
    providerId,
    payload,
  }: CancelOrderByProviderCommand) {
    if (!payload?.reason)
      throw new BadRequestException('Informe o motivo da recusa');
    const note = payload.note?.trim() || null;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { service: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.service || order.service.providerId !== providerId) {
      throw new ForbiddenException('Provider not allowed to cancel this order');
    }
    const cancellable: OrderStatus[] = [
      OrderStatus.AGUARDANDO_APROVACAO,
      OrderStatus.AGUARDANDO_PAGAMENTO,
      OrderStatus.AGENDADO,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        'Only orders awaiting approval, awaiting payment, or scheduled can be cancelled by provider',
      );
    }
    if (order.payment) await this.payments.cancelPayment(order.payment);
    return this.prisma.order.update({
      where: { id: orderId, status: { in: cancellable } },
      data: {
        status: OrderStatus.CANCELADO,
        cancellationReason: payload.reason,
        cancellationNote: note,
        orderTimeline: {
          create: {
            event: 'CANCELED',
            description: cancellationDescription(payload.reason, note),
            createdBy: 'PRESTADOR',
            createdAt: new Date(),
          },
        },
      },
    });
  }
}
