import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { OrderExpiredEvent } from './order-expired.event';

/** Avisa cliente e prestador quando um pedido parado expira. */
@EventsHandler(OrderExpiredEvent)
export class OrderExpiredHandler implements IEventHandler<OrderExpiredEvent> {
  private readonly logger = new Logger(OrderExpiredHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async handle({ orderId, previousStatus }: OrderExpiredEvent) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          scheduledFor: true,
          client: { select: { email: true, name: true } },
          service: {
            select: {
              title: true,
              provider: {
                select: { user: { select: { email: true, name: true } } },
              },
            },
          },
        },
      });
      if (!order?.service?.provider?.user) return;

      await this.notifications.notifyOrderExpired(
        order.client,
        order.service.provider.user,
        {
          id: order.id,
          serviceTitle: order.service.title,
          scheduledFor: order.scheduledFor,
        },
        previousStatus === 'AGUARDANDO_APROVACAO' ? 'PROVIDER' : 'PAYMENT',
      );
    } catch (error) {
      this.logger.error(
        `Falha ao avisar expiração do pedido ${orderId.toString()}: ${(error as Error).message}`,
      );
    }
  }
}
