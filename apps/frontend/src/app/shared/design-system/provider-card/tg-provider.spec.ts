import { toNumber, toTgProvider } from './tg-provider';

// Formato real da API (publicProviderSelect no backend, depois do BigIntInterceptor):
// id do Provider em texto, user com o id do usuário, serviços ativos sem ordem.
const apiProvider = (patch: Record<string, unknown> = {}) => ({
  id: '42',
  bio: null,
  ratingAvg: 4.8,
  ratingCount: 32,
  verified: true,
  user: { id: '900', name: 'Ana Souza', photoUrl: 'https://cdn/ana.jpg' },
  services: [{ id: '7', providerId: '42', title: 'Limpeza residencial', category: 'limpeza', basePrice: 120, status: 'ATIVO' }],
  locations: [{ lat: -23.55, lng: -46.63 }],
  ...patch,
});

const service = (id: string, title: string, basePrice: unknown, extra: Record<string, unknown> = {}) => ({
  id,
  providerId: '42',
  title,
  category: 'limpeza',
  basePrice,
  status: 'ATIVO',
  ...extra,
});

describe('toTgProvider', () => {
  it('converte o formato da API', () => {
    expect(toTgProvider({ ...apiProvider(), distanceKm: 1.25 })).toEqual({
      id: '42',
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

  describe('id: só o do Provider, nunca o do usuário', () => {
    it('id válido', () => {
      expect(toTgProvider(apiProvider())!.id).toBe('42');
      expect(toTgProvider(apiProvider({ id: 42 }))!.id).toBe('42');
    });

    it('providerId válido', () => {
      expect(toTgProvider(apiProvider({ id: undefined, providerId: '43' }))!.id).toBe('43');
    });

    it('só user.id: devolve null', () => {
      expect(toTgProvider({ user: { id: '900', name: 'Ana' }, services: [] })).toBeNull();
    });

    it('sem identificador: devolve null', () => {
      expect(toTgProvider({ user: { name: 'Ana' } })).toBeNull();
      expect(toTgProvider({})).toBeNull();
      expect(toTgProvider(null)).toBeNull();
      expect(toTgProvider('42')).toBeNull();
      expect(toTgProvider([apiProvider()])).toBeNull();
    });

    it('ids vazios ou inválidos: devolve null (e não cai no user.id)', () => {
      for (const id of ['', '   ', '0', '000', '-3', '4.2', 'abc', '42abc', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2, true, {}, []]) {
        expect(toTgProvider(apiProvider({ id })))
          .withContext(String(id))
          .toBeNull();
      }
    });

    it('id do prestador e user.id diferentes: fica o do prestador', () => {
      const out = toTgProvider(apiProvider({ id: '42', user: { id: '900', name: 'Ana' } }))!;
      expect(out.id).toBe('42');
      expect(out.id).not.toBe('900');
    });

    it('registro de usuário com o prestador aninhado: usa provider.id, não o id do usuário', () => {
      const user = { id: '900', name: 'Ana', photoUrl: null, provider: { id: '42', verified: true, ratingAvg: 4.5, ratingCount: 2 } };
      const out = toTgProvider(user)!;
      expect(out.id).toBe('42');
      expect(out.name).toBe('Ana');
      expect(out.verified).toBeTrue();
      expect(toTgProvider({ id: '900', name: 'Ana', provider: { verified: true } })).toBeNull();
    });

    it('preserva o id como texto (BigInt grande não perde dígitos)', () => {
      expect(toTgProvider(apiProvider({ id: '9007199254740993' }))!.id).toBe('9007199254740993');
      expect(toTgProvider(apiProvider({ id: ' 0042 ' }))!.id).toBe('42');
      expect(toTgProvider(apiProvider({ id: 9007199254740993n }))!.id).toBe('9007199254740993');
    });
  });

  describe('serviço e preço: o menor preço válido, sem depender da ordem', () => {
    const pick = (services: unknown[], category?: string) => {
      const out = toTgProvider(apiProvider({ services }), { category })!;
      return { service: out.service, priceFrom: out.priceFrom };
    };

    it('R$ 200 e R$ 80, em qualquer ordem: "a partir de" 80, com o serviço de 80', () => {
      const caro = service('1', 'Faxina completa', 200);
      const barato = service('2', 'Passar roupa', 80);
      expect(pick([caro, barato])).toEqual({ service: 'Passar roupa', priceFrom: 80 });
      expect(pick([barato, caro])).toEqual({ service: 'Passar roupa', priceFrom: 80 });
    });

    it('preços iguais: desempata pelo título e depois pelo id, nas duas ordens', () => {
      const a = service('2', 'Banheiro', 90);
      const b = service('1', 'Cozinha', 90);
      expect(pick([b, a])).toEqual({ service: 'Banheiro', priceFrom: 90 });
      expect(pick([a, b])).toEqual({ service: 'Banheiro', priceFrom: 90 });
      const c = service('10', 'Banheiro', 90);
      const d = service('9', 'Banheiro', 90);
      expect(toTgProvider(apiProvider({ services: [c, d] }))!.priceFrom).toBe(90);
    });

    it('serviço sem preço não vence um com preço', () => {
      expect(pick([service('1', 'A sem preço', null), service('2', 'Pintura', 150)])).toEqual({ service: 'Pintura', priceFrom: 150 });
    });

    it('preços inválidos (negativo, zero, NaN, Infinity, texto) são ignorados', () => {
      const invalid = [-10, 0, NaN, Infinity, -Infinity, 'abc', '', undefined, {}];
      for (const price of invalid) {
        expect(pick([service('1', 'Inválido', price), service('2', 'Pintura', 150)]))
          .withContext(String(price))
          .toEqual({ service: 'Pintura', priceFrom: 150 });
      }
    });

    it('nenhum preço válido: mantém um título real e o preço fica null ("Preço sob consulta")', () => {
      expect(pick([service('1', 'Pintura', null), service('2', 'Elétrica', 0)])).toEqual({ service: 'Elétrica', priceFrom: null });
    });

    it('preço como texto numérico e como Decimal do Prisma', () => {
      expect(pick([service('1', 'A', '120.50'), service('2', 'B', '99.90')])).toEqual({ service: 'B', priceFrom: 99.9 });
      expect(pick([service('1', 'A', { s: 1, e: 2, d: [120] }), service('2', 'B', { s: 1, e: 1, d: [85] })])).toEqual({
        service: 'B',
        priceFrom: 85,
      });
    });

    it('lista vazia, ausente ou malformada: sem serviço e sem preço', () => {
      for (const services of [[], undefined, null, 'x', [null, 3, 'a']]) {
        expect(toTgProvider(apiProvider({ services }))!)
          .withContext(JSON.stringify(services) ?? 'undefined')
          .toEqual(jasmine.objectContaining({ service: null, priceFrom: null }));
      }
    });

    it('serviço inativo não conta', () => {
      expect(pick([service('1', 'Antigo', 30, { status: 'INATIVO' }), service('2', 'Atual', 100)])).toEqual({
        service: 'Atual',
        priceFrom: 100,
      });
    });

    it('com categoria: só os serviços dela, mesmo que outro seja mais barato', () => {
      const services = [
        service('1', 'Instalação elétrica', 50, { category: 'eletrica' }),
        service('2', 'Faxina', 130, { category: 'limpeza' }),
        service('3', 'Passar roupa', 110, { category: 'limpeza' }),
      ];
      expect(pick(services, 'limpeza')).toEqual({ service: 'Passar roupa', priceFrom: 110 });
      expect(pick(services)).toEqual({ service: 'Instalação elétrica', priceFrom: 50 });
      expect(pick(services, 'pintura')).toEqual({ service: null, priceFrom: null });
    });

    it('título e preço são sempre do mesmo serviço', () => {
      const services = [service('1', 'Faxina', 300), service('2', 'Vidros', 75), service('3', 'Sofá', 75.5)];
      for (const order of [services, [...services].reverse(), [services[1], services[2], services[0]]]) {
        const out = pick(order);
        const source = services.find((s) => s.title === out.service)!;
        expect(out.priceFrom).toBe(source.basePrice as number);
        expect(out).toEqual({ service: 'Vidros', priceFrom: 75 });
      }
    });
  });

  it('não inventa dados: o que falta vira null, e o nome padrão é "Profissional"', () => {
    expect(toTgProvider({ id: '5', user: { name: '   ', photoUrl: '' }, services: [] })).toEqual({
      id: '5',
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

  it('nota como texto e no formato Decimal do Prisma', () => {
    expect(toTgProvider(apiProvider({ ratingAvg: '4.80' }))!.rating).toBe(4.8);
    expect(toTgProvider(apiProvider({ ratingAvg: { s: 1, e: 0, d: [4, 8000000] } }))!.rating).toBe(4.8);
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
