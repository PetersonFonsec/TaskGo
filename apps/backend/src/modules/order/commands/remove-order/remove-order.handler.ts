import { ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveOrderCommand } from './remove-order.command';

@CommandHandler(RemoveOrderCommand)
export class RemoveOrderHandler implements ICommandHandler<RemoveOrderCommand> {
  async execute(_command: RemoveOrderCommand): Promise<never> {
    throw new ForbiddenException(
      'Use a supported explicit order lifecycle action',
    );
  }
}
