import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateServiceCommand } from './update-service.command';

@CommandHandler(UpdateServiceCommand)
export class UpdateServiceHandler
  implements ICommandHandler<UpdateServiceCommand>
{
  async execute({ id }: UpdateServiceCommand) {
    return `This action updates a #${id} service`;
  }
}
