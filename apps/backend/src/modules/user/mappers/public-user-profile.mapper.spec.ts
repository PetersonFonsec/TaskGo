import { toPublicUserProfile } from './public-user-profile.mapper';

describe('toPublicUserProfile', () => {
  it('serializes ids and dates while omitting sensitive and broad relation fields', () => {
    const profile = toPublicUserProfile({
      id: BigInt(42),
      name: 'Customer User',
      email: 'customer@example.com',
      phone: '5511999999999',
      cpf: '12345678901',
      type: 'CLIENTE',
      photoUrl: null,
      bio: null,
      createdAt: new Date('2026-07-09T12:00:00.000Z'),
      updatedAt: new Date('2026-07-09T12:30:00.000Z'),
      addresses: [
        {
          id: BigInt(7),
          label: 'Home',
          street: 'Main Street',
          city: 'Sao Paulo',
          state: 'SP',
          cep: '01001000',
          lat: -23.55,
          lng: -46.63,
          isDefault: true,
        },
      ],
      passwordHash: 'SECRET',
      orders: [{ id: BigInt(1) }],
      reviews: [{ id: BigInt(2) }],
      provider: { id: BigInt(42) },
    } as any);

    expect(profile).toEqual(
      expect.objectContaining({
        id: '42',
        createdAt: '2026-07-09T12:00:00.000Z',
        updatedAt: '2026-07-09T12:30:00.000Z',
      }),
    );
    expect(profile.addresses?.[0]).toEqual(
      expect.objectContaining({
        id: '7',
        street: 'Main Street',
        city: 'Sao Paulo',
      }),
    );
    expect(profile).not.toHaveProperty('password');
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).not.toHaveProperty('orders');
    expect(profile).not.toHaveProperty('reviews');
    expect(profile).not.toHaveProperty('provider');
  });
});
