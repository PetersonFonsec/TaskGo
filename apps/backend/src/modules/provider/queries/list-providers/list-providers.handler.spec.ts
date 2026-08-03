import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { ListProvidersHandler } from './list-providers.handler';
import { ListProvidersQuery } from './list-providers.query';

describe('ListProvidersHandler', () => {
  let prisma: any;
  let mediator: any;
  let flags: any;
  let handler: ListProvidersHandler;

  beforeEach(() => {
    prisma = {
      provider: { findMany: jest.fn().mockResolvedValue([]) },
      clientFavorite: { findMany: jest.fn() },
    };
    mediator = { publish: jest.fn() };
    flags = { isFavoritesMvpEnabled: jest.fn().mockReturnValue(true) };
    handler = new ListProvidersHandler(prisma, mediator, flags);
  });

  it('lists all providers without consulting favorites', async () => {
    await handler.execute(new ListProvidersQuery(false));

    expect(prisma.provider.findMany).toHaveBeenCalledWith({
      include: { user: true, services: true },
    });
    expect(prisma.clientFavorite.findMany).not.toHaveBeenCalled();
  });

  it('lists favorites and publishes filter telemetry', async () => {
    prisma.clientFavorite.findMany.mockResolvedValue([
      { provider: { id: 42n } },
    ]);

    await expect(
      handler.execute(new ListProvidersQuery(true, '7')),
    ).resolves.toEqual([{ id: 42n }]);
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorites.searchFilter.used',
      expect.objectContaining({ clientId: 7n, resultCount: 1 }),
    );
  });

  it('enforces feature availability and authenticated identity', async () => {
    flags.isFavoritesMvpEnabled.mockReturnValue(false);
    await expect(
      handler.execute(new ListProvidersQuery(true, '7')),
    ).rejects.toBeInstanceOf(NotFoundException);

    flags.isFavoritesMvpEnabled.mockReturnValue(true);
    await expect(
      handler.execute(new ListProvidersQuery(true)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
