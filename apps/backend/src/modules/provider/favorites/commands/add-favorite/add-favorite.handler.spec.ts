import { AddFavoriteCommand } from './add-favorite.command';
import { AddFavoriteHandler } from './add-favorite.handler';

describe('AddFavoriteHandler', () => {
  it('upserts the favorite and publishes telemetry', async () => {
    const favorite = {
      id: 3n,
      clientId: 1n,
      providerId: 2n,
      createdAt: new Date(),
    };
    const prisma: any = {
      clientFavorite: { upsert: jest.fn().mockResolvedValue(favorite) },
    };
    const mediator: any = { publish: jest.fn() };
    const handler = new AddFavoriteHandler(prisma, mediator);

    await expect(handler.execute(new AddFavoriteCommand(1n, 2n))).resolves.toBe(
      favorite,
    );
    expect(prisma.clientFavorite.upsert).toHaveBeenCalledWith({
      where: { clientId_providerId: { clientId: 1n, providerId: 2n } },
      update: {},
      create: { clientId: 1n, providerId: 2n },
    });
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorite.add',
      expect.objectContaining({ clientId: 1n, providerId: 2n }),
    );
  });
});
