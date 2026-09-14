import { coveragePoint, providerCoverageWhere } from './coverage';

describe('Provider geographic coverage', () => {
  it.each([
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: 'NaN', lng: 0 },
    { lat: 'Infinity', lng: 0 },
    { lat: 0 },
    { lat: '', lng: 0 },
  ])('rejects invalid point %j', (point) => {
    expect(() => coveragePoint(point)).toThrow();
  });
  it('accepts zero and geographic boundaries', () => {
    expect(coveragePoint({ lat: '0', lng: '0' })).toEqual({ lat: 0, lng: 0 });
    expect(coveragePoint({ lat: -90, lng: 180 })).toEqual({
      lat: -90,
      lng: 180,
    });
  });
  it('parameterizes the location and preserves all matching providers', async () => {
    const db = {
      $queryRaw: jest.fn().mockResolvedValue(
        Array.from({ length: 150 }, (_, i) => ({
          providerId: BigInt(i + 1),
        })),
      ),
    };
    const where = await providerCoverageWhere(db as any, {
      lat: -23.5,
      lng: -46.6,
    });
    expect((where.id as any).in).toHaveLength(150);
    expect(db.$queryRaw.mock.calls[0].slice(1)).toEqual([-23.5, -23.5, -46.6]);
    const sql = db.$queryRaw.mock.calls[0][0].join('?');
    expect(sql).toContain('<= radius_km');
    expect(sql).not.toContain('LIMIT');
  });
  it('without a point still requires a configured active radius', async () => {
    const where = await providerCoverageWhere({} as any, {});
    expect(where.serviceAreas).toEqual(
      expect.objectContaining({
        some: expect.objectContaining({ active: true, mode: 'RADIUS' }),
      }),
    );
  });
});
