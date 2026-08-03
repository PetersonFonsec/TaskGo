import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../prisma/prisma.service';
import { UpdateOrderCommand } from './update-order.command';

@CommandHandler(UpdateOrderCommand)
export class UpdateOrderHandler implements ICommandHandler<UpdateOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ id, payload }: UpdateOrderCommand) {
    const data: Prisma.OrderUpdateInput = {
      ...payload,
    } as Prisma.OrderUpdateInput;
    if (payload.clientId)
      data.client = { connect: { id: BigInt(payload.clientId) } };
    if (payload.serviceId)
      data.service = { connect: { id: BigInt(payload.serviceId) } };
    delete (data as Record<string, unknown>).clientId;
    delete (data as Record<string, unknown>).serviceId;
    if (payload.scheduledFor)
      data.scheduledFor = new Date(payload.scheduledFor);
    return this.prisma.order.update({ where: { id }, data });
  }
}
