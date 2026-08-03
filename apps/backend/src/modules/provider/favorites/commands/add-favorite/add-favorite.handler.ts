import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../../prisma/prisma.service';
import Mediator from '../../../../../shared/events/mediator';
import { AddFavoriteCommand } from './add-favorite.command';

@CommandHandler(AddFavoriteCommand)
export class AddFavoriteHandler implements ICommandHandler<AddFavoriteCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediator: Mediator,
  ) {}

  async execute({ clientId, providerId }: AddFavoriteCommand) {
    const favorite = await this.prisma.clientFavorite.upsert({
      where: { clientId_providerId: { clientId, providerId } },
      update: {},
      create: { clientId, providerId },
    });
    await this.mediator.publish('favorite.add', {
      clientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
      createdAt: favorite.createdAt,
    });
    return favorite;
  }
}
