import { ListFavoritesHandler } from './list-favorites.handler';
import { ListFavoritesQuery } from './list-favorites.query';

describe('ListFavoritesHandler', () => {
  it('returns a paginated list and publishes view telemetry', async () => {
    const prisma: any = {
      clientFavorite: {
        findMany: jest.fn().mockResolvedValue([{ id: 3n }]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const mediator: any = { publish: jest.fn() };
    const handler = new ListFavoritesHandler(prisma, mediator);

    await expect(
      handler.execute(new ListFavoritesQuery(1n, { skip: 5, take: 10 })),
    ).resolves.toEqual({ items: [{ id: 3n }], total: 1 });
    expect(prisma.clientFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 1n }, skip: 5, take: 10 }),
    );
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorites.view',
      expect.objectContaining({ clientId: 1n, resultCount: 1 }),
    );
  });
});
