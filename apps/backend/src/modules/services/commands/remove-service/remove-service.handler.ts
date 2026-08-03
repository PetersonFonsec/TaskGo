import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { RemoveServiceCommand } from './remove-service.command';

@CommandHandler(RemoveServiceCommand)
export class RemoveServiceHandler
  implements ICommandHandler<RemoveServiceCommand>
{
  async execute({ id }: RemoveServiceCommand) {
    return `This action removes a #${id} service`;
  }
}
