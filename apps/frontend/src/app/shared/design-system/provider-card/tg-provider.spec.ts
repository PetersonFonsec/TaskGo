import { toNumber, toTgProvider } from './tg-provider';

describe('toTgProvider', () => {
  it('sem objeto ou sem id, devolve null (sem id não há link para o perfil)', () => {
    expect(toTgProvider(null)).toBeNull();
    expect(toTgProvider('ana')).toBeNull();
    expect(toTgProvider({ user: { name: 'Ana' } })).toBeNull();
    expect(toTgProvider({ id: '' })).toBeNull();
  });

  it('lê o formato da busca: dados no usuário e preço no primeiro serviço', () => {
    expect(
      toTgProvider({
        id: 'p1',
        verified: true,
        ratingAvg: '4.80',
        ratingCount: 32,
        distanceKm: 1.25,
        user: { name: ' Ana Souza ', photoUrl: 'https://cdn/ana.jpg' },
        services: [{ title: 'Limpeza residencial', basePrice: '120.00' }, { title: 'Outro', basePrice: 10 }],
      }),
    ).toEqual({
      id: 'p1',
      name: 'Ana Souza',
      photoUrl: 'https://cdn/ana.jpg',
      verified: true,
      rating: 4.8,
      ratingCount: 32,
      service: 'Limpeza residencial',
      priceFrom: 120,
      distanceKm: 1.25,
    });
  });

  it('usa os campos alternativos: providerId, user.id, perfil do usuário, name e price', () => {
    const fromUser = toTgProvider({
      user: { id: 7, provider: { verified: true, ratingAvg: 4.5, ratingCount: 2 } },
      name: 'Bruno',
      services: [{ name: 'Pintura', price: 80 }],
      distance: '2.5',
    })!;
    expect(fromUser.id).toBe('7');
    expect(fromUser.name).toBe('Bruno');
    expect(fromUser.verified).toBeTrue();
    expect(fromUser.rating).toBe(4.5);
    expect(fromUser.ratingCount).toBe(2);
    expect(fromUser.service).toBe('Pintura');
    expect(fromUser.priceFrom).toBe(80);
    expect(fromUser.distanceKm).toBe(2.5);
    expect(toTgProvider({ providerId: 'x' })!.id).toBe('x');
  });

  it('não inventa dados: o que falta vira null, e o nome padrão é "Profissional"', () => {
    expect(toTgProvider({ id: 'p', user: { name: '   ', photoUrl: '' }, services: [] })).toEqual({
      id: 'p',
      name: 'Profissional',
      photoUrl: null,
      verified: false,
      rating: null,
      ratingCount: null,
      service: null,
      priceFrom: null,
      distanceKm: null,
    });
  });

  it('nota no formato Decimal do Prisma (decimal.js)', () => {
    expect(toTgProvider({ id: 'p', ratingAvg: { s: 1, e: 0, d: [4, 8000000] } })!.rating).toBe(4.8);
  });
});

describe('toNumber', () => {
  it('aceita número finito, texto numérico e Decimal', () => {
    expect(toNumber(3)).toBe(3);
    expect(toNumber(' 4.5 ')).toBe(4.5);
    expect(toNumber({ s: 1, e: 2, d: [128, 5000000] })).toBe(128.5);
    expect(toNumber({ s: -1, e: 0, d: [3] })).toBe(-3);
    expect(toNumber({ s: 1, e: -1, d: [5000000] })).toBe(0.5);
    expect(toNumber({ s: 1, e: 7, d: [1, 2345678] })).toBe(12345678);
  });

  it('o resto vira undefined', () => {
    for (const v of [undefined, null, '', '  ', 'abc', NaN, Infinity, -Infinity, {}, [], true, { s: 1, e: 0, d: [] }, { s: 2, e: 0, d: [1] }]) {
      expect(toNumber(v)).withContext(JSON.stringify(v) ?? String(v)).toBeUndefined();
    }
  });
});
