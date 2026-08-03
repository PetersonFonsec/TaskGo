import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfirmOrderByProviderCommand } from './confirm-order-by-provider.command';

@CommandHandler(ConfirmOrderByProviderCommand)
export class ConfirmOrderByProviderHandler
  implements ICommandHandler<ConfirmOrderByProviderCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute({ orderId, providerId }: ConfirmOrderByProviderCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { service: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.service || order.service.providerId !== providerId) {
      throw new ForbiddenException(
        'Provider not allowed to confirm this order',
      );
    }
    if (order.status !== OrderStatus.AGUARDANDO_APROVACAO) {
      throw new BadRequestException(
        'Only AGUARDANDO_APROVACAO orders can be confirmed',
      );
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.AGUARDANDO_PAGAMENTO },
    });
  }
}
