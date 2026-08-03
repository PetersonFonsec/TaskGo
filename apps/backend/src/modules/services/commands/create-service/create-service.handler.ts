import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateServiceCommand } from './create-service.command';

@CommandHandler(CreateServiceCommand)
export class CreateServiceHandler
  implements ICommandHandler<CreateServiceCommand>
{
  async execute(_command: CreateServiceCommand) {
    return 'This action adds a new service';
  }
}
