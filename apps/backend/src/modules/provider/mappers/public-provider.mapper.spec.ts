import { publicProviderSelect } from './public-provider.mapper';
import { GetProviderHandler } from '../queries/get-provider/get-provider.handler';

// Simulates the Prisma projection over a deliberately sensitive database record.
function project(record: any, select: any): any {
  return Object.fromEntries(
    Object.entries(select).map(([key, rule]: [string, any]) => {
      const value = record[key];
      if (rule === true) return [key, value];
      if (Array.isArray(value))
        return [
          key,
          value
            .slice(0, rule.take ?? value.length)
            .map((item) => project(item, rule.select)),
        ];
      return [key, value ? project(value, rule.select) : value];
    }),
  );
}

describe('public provider privacy', () => {
  it('projects recursively without account secrets, recipient, reviews or exact history', async () => {
    const secret = {
      passwordHash: 'SECRET',
      cpf: '123',
      email: 'PRIVATE',
      phone: 'PRIVATE',
    };
    const record = {
      id: 1n,
      ...secret,
      pagarmeRecipientId: 'PRIVATE',
      whatsapp: 'PRIVATE',
      user: {
        id: 1n,
        name: 'Provider',
        ...secret,
        addresses: [{ street: 'PRIVATE' }],
      },
      reviews: [
        {
          id: 4n,
          rating: 5,
          comment: 'Great service',
          clientId: 2n,
          orderId: 3n,
        },
      ],
      services: [
        {
          id: 1n,
          title: 'Service',
          platformFeePct: 10,
          orders: [{ clientId: 2n }],
        },
      ],
      locations: [
        { lat: -23.54321, lng: -46.65432, capturedAt: new Date() },
        { lat: 12, lng: 34 },
      ],
    };
    const prisma: any = {
      provider: {
        findUnique: jest.fn(({ select }) => project(record, select)),
      },
    };
    const result = await new GetProviderHandler(prisma).execute({ id: 1n });
    const json = JSON.stringify(result, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    for (const key of [
      'passwordHash',
      'cpf',
      'email',
      'phone',
      'addresses',
      'pagarmeRecipientId',
      'whatsapp',
      'clientId',
      'orderId',
      'orders',
      'platformFeePct',
      'capturedAt',
    ]) {
      expect(json).not.toContain('"' + key + '"');
    }
    expect(result?.reviews).toEqual([
      { id: 4n, rating: 5, comment: 'Great service', reviewedAt: undefined },
    ]);
    expect(result?.locations).toEqual([{ lat: -23.54, lng: -46.65 }]);
    expect(prisma.provider.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
          status: 'APPROVED',
          services: { some: { status: 'ATIVO' } },
        },
        select: expect.objectContaining(publicProviderSelect),
      }),
    );
  });
  it('returns null when a provider is not eligible for public discovery', async () => {
    const prisma: any = {
      provider: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      new GetProviderHandler(prisma).execute({ id: 1n }),
    ).resolves.toBeNull();
  });
});
