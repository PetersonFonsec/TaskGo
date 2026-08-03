import { RemoveFavoriteCommand } from './remove-favorite.command';
import { RemoveFavoriteHandler } from './remove-favorite.handler';

describe('RemoveFavoriteHandler', () => {
  it('removes an existing favorite and publishes telemetry', async () => {
    const favorite = { id: 3n, clientId: 1n, providerId: 2n };
    const prisma: any = {
      clientFavorite: {
        findUnique: jest.fn().mockResolvedValue(favorite),
        delete: jest.fn(),
      },
    };
    const mediator: any = { publish: jest.fn() };
    const handler = new RemoveFavoriteHandler(prisma, mediator);

    await expect(
      handler.execute(new RemoveFavoriteCommand(1n, 2n)),
    ).resolves.toBe(favorite);
    expect(prisma.clientFavorite.delete).toHaveBeenCalledWith({
      where: { id: 3n },
    });
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorite.remove',
      expect.objectContaining({ clientId: 1n, providerId: 2n }),
    );
  });

  it('is idempotent when the favorite does not exist', async () => {
    const prisma: any = {
      clientFavorite: {
        findUnique: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    };
    const handler = new RemoveFavoriteHandler(prisma, {
      publish: jest.fn(),
    } as any);

    await expect(
      handler.execute(new RemoveFavoriteCommand(1n, 2n)),
    ).resolves.toBeNull();
    expect(prisma.clientFavorite.delete).not.toHaveBeenCalled();
  });
});
