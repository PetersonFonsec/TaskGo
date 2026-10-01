import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentService } from '../../../payments/payment.service';
import { NotificationService } from '../../../notification/notification.service';
import { CancelOrderByProviderCommand } from './cancel-order-by-provider.command';

@CommandHandler(CancelOrderByProviderCommand)
export class CancelOrderByProviderHandler
  implements ICommandHandler<CancelOrderByProviderCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly notifications: NotificationService,
  ) {}

  async execute({ orderId, providerId }: CancelOrderByProviderCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        payment: true,
        client: { select: { email: true, name: true } },
      },
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
    const canceledPayment = order.payment
      ? await this.payments.cancelPayment(order.payment)
      : null;
    const updated = await this.prisma.order.update({
      where: { id: orderId, status: { in: cancellable } },
      data: {
        status: OrderStatus.CANCELADO,
        orderTimeline: {
          create: {
            event: 'CANCELED',
            createdBy: 'PRESTADOR',
            createdAt: new Date(),
          },
        },
      },
    });

    void this.notifications.notifyClientOrderCanceledByProvider(
      order.client,
      { id: orderId, serviceTitle: order.service.title },
      {
        refused: order.status === OrderStatus.AGUARDANDO_APROVACAO,
        refunded: canceledPayment?.status === PaymentStatus.REEMBOLSADO,
      },
    );
    return updated;
  }
}
