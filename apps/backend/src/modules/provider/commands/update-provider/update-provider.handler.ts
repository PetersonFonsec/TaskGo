import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UpdateProviderCommand } from './update-provider.command';

@CommandHandler(UpdateProviderCommand)
export class UpdateProviderHandler
  implements ICommandHandler<UpdateProviderCommand>
{
  async execute({ id }: UpdateProviderCommand) {
    return `This action updates a #${id} provider`;
  }
}
