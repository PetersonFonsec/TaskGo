import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProviderCommand } from './create-provider.command';
@CommandHandler(CreateProviderCommand)
export class CreateProviderHandler
  implements ICommandHandler<CreateProviderCommand>
{
  async execute(_command: CreateProviderCommand) {
    throw new BadRequestException(
      'Use /auth/register para cadastrar uma conta de prestador',
    );
  }
}
