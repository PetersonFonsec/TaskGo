import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../../prisma/prisma.service';
import Mediator from '../../../../../shared/events/mediator';
import { RemoveFavoriteCommand } from './remove-favorite.command';

@CommandHandler(RemoveFavoriteCommand)
export class RemoveFavoriteHandler
  implements ICommandHandler<RemoveFavoriteCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediator: Mediator,
  ) {}

  async execute({ clientId, providerId }: RemoveFavoriteCommand) {
    const favorite = await this.prisma.clientFavorite.findUnique({
      where: { clientId_providerId: { clientId, providerId } },
    });
    if (!favorite) return null;

    await this.prisma.clientFavorite.delete({ where: { id: favorite.id } });
    await this.mediator.publish('favorite.remove', {
      clientId,
      providerId,
      favoriteId: favorite.id,
      timestamp: new Date().toISOString(),
    });
    return favorite;
  }
}
