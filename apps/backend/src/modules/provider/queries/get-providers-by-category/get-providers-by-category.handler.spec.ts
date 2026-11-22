import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { GetProvidersByCategoryHandler } from './get-providers-by-category.handler';
import { GetProvidersByCategoryQuery } from './get-providers-by-category.query';

describe('GetProvidersByCategoryHandler', () => {
  const provider = {
    id: 5n,
    ratingAvg: 4.8,
    services: [
      { id: 10n, category: 'limpeza', status: 'ATIVO', basePrice: 75 },
    ],
    locations: [],
  };

  function setup(enabled = true) {
    const prisma = {
      provider: { findMany: jest.fn().mockResolvedValue([provider]) },
      clientFavorite: {
        findMany: jest.fn().mockResolvedValue([
          { provider, createdAt: new Date('2026-11-22T00:00:00Z') },
        ]),
      },
    };
    const mediator = { publish: jest.fn() };
    const featureFlagService = {
      isFavoritesMvpEnabled: jest.fn().mockReturnValue(enabled),
    };
    const handler = new GetProvidersByCategoryHandler(
      prisma as never,
      mediator as never,
      featureFlagService as never,
    );
    return { handler, prisma, mediator, featureFlagService };
  }

  it('filters category results to favorites for the authenticated client', async () => {
    const { handler, prisma, mediator } = setup();

    const result = await handler.execute(
      new GetProvidersByCategoryQuery('limpeza', {}, {}, true, '7'),
    );

    expect(prisma.clientFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 7n,
          provider: expect.objectContaining({
            services: { some: { category: 'limpeza', status: 'ATIVO' } },
          }),
        }),
      }),
    );
    expect(prisma.provider.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 5n,
        distanceKm: null,
        services: [expect.objectContaining({ basePrice: 75 })],
      }),
    ]);
    expect(mediator.publish).toHaveBeenCalledWith(
      'favorites.searchFilter.used',
      expect.objectContaining({ clientId: 7n, resultCount: 1 }),
    );
  });

  it('requires a client identity for favorites filtering', async () => {
    const { handler } = setup();

    await expect(
      handler.execute(new GetProvidersByCategoryQuery('limpeza', {}, {}, true)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('respects the favorites feature flag', async () => {
    const { handler } = setup(false);

    await expect(
      handler.execute(new GetProvidersByCategoryQuery('limpeza', {}, {}, true, '7')),
    ).rejects.toThrow(NotFoundException);
  });
});
