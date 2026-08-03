import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { RemoveProviderCommand } from './remove-provider.command';

@CommandHandler(RemoveProviderCommand)
export class RemoveProviderHandler
  implements ICommandHandler<RemoveProviderCommand>
{
  async execute({ id }: RemoveProviderCommand) {
    return `This action removes a #${id} provider`;
  }
}
