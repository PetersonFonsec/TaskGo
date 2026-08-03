import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { CancelOrderByProviderCommand } from './cancel-order-by-provider.command';

@CommandHandler(CancelOrderByProviderCommand)
export class CancelOrderByProviderHandler
  implements ICommandHandler<CancelOrderByProviderCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ orderId, providerId }: CancelOrderByProviderCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { service: true },
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
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELADO },
    });
  }
}
