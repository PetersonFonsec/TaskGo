import { filterAndOrderProviders } from './provider-search';

describe('filterAndOrderProviders', () => {
  it('filters by rating and the cheapest active service in the category', () => {
    const providers = [
      {
        id: 1n,
        ratingAvg: 4.7,
        services: [
          { category: 'eletrica', status: 'ATIVO', basePrice: 200 },
          { category: 'eletrica', status: 'ATIVO', basePrice: 90 },
          { category: 'eletrica', status: 'INATIVO', basePrice: 40 },
        ],
      },
      {
        id: 2n,
        ratingAvg: 3.5,
        services: [{ category: 'eletrica', status: 'ATIVO', basePrice: 100 }],
      },
      {
        id: 3n,
        ratingAvg: 4.8,
        services: [{ category: 'hidraulica', status: 'ATIVO', basePrice: 100 }],
      },
    ];

    const result = filterAndOrderProviders(
      providers,
      {},
      { minimumRating: 4, minimumPrice: 80, maximumPrice: 100 },
      'eletrica',
    );

    expect(result.map(({ id }) => id)).toEqual([1n]);
    expect(result[0].distanceKm).toBeNull();
  });

  it('orders providers by distance and keeps unknown distances last', () => {
    const providers = [
      { id: 1n, locations: [{ lat: 0, lng: 0.1 }] },
      { id: 2n, locations: [{ lat: 0, lng: 0.05 }] },
      { id: 3n, locations: [] },
    ];

    const result = filterAndOrderProviders(providers, { lat: 0, lng: 0 }, {});

    expect(result.map(({ id }) => id)).toEqual([2n, 1n, 3n]);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm!);
    expect(result[2].distanceKm).toBeNull();
  });

  it('excludes unknown distance when a maximum distance is requested', () => {
    const result = filterAndOrderProviders(
      [{ id: 1n, locations: [] }],
      { lat: 0, lng: 0 },
      { maximumDistance: 10 },
    );

    expect(result).toEqual([]);
  });
});
