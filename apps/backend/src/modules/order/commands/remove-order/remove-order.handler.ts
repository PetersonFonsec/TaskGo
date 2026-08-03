import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { RemoveOrderCommand } from './remove-order.command';

@CommandHandler(RemoveOrderCommand)
export class RemoveOrderHandler implements ICommandHandler<RemoveOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}
  execute({ id }: RemoveOrderCommand) {
    return this.prisma.order.delete({ where: { id } });
  }
}
