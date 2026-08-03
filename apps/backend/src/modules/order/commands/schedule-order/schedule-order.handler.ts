import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { ScheduleOrderCommand } from './schedule-order.command';

@CommandHandler(ScheduleOrderCommand)
export class ScheduleOrderHandler
  implements ICommandHandler<ScheduleOrderCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  execute({ id, payload }: ScheduleOrderCommand) {
    return this.prisma.order.update({
      where: { id },
      data: {
        scheduledFor: new Date(payload.scheduledFor),
        status: OrderStatus.AGENDADO,
      },
    });
  }
}
