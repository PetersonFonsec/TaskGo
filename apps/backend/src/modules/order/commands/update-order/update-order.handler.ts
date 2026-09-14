import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateOrderCommand } from './update-order.command';

@CommandHandler(UpdateOrderCommand)
export class UpdateOrderHandler implements ICommandHandler<UpdateOrderCommand> {
  async execute(_command: UpdateOrderCommand): Promise<never> {
    throw new ForbiddenException(
      'Use a supported explicit order lifecycle action',
    );
  }
}
