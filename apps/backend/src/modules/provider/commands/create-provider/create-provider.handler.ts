import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { UserService } from '../../../user/user.service';
import { CreateProviderCommand } from './create-provider.command';

@CommandHandler(CreateProviderCommand)
export class CreateProviderHandler
  implements ICommandHandler<CreateProviderCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  execute({ payload }: CreateProviderCommand) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.userService.create(payload.provider, tx);
      await tx.provider.create({
        data: {
          id: user.id,
          bio: payload.provider?.bio,
          status: 'PENDING',
          verified: false,
          services: { connect: payload.services.map((id) => ({ id })) },
        },
      });
      return user;
    });
  }
}
