/// <reference types="cypress" />

/**
 * Fábricas de respostas da API para os testes com mocks.
 *
 * Cada fábrica devolve só os campos que a API real envia. Quando um contrato
 * mudar no backend, a fábrica muda aqui e todos os specs acompanham.
 * Use `overrides` para o que o cenário precisa diferente do padrão.
 */

export type Papel = 'CLIENTE' | 'PRESTADOR';

export interface Endereco {
  id: string;
  label: string;
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  active: boolean;
}

export interface UsuarioDaSessao {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: Papel;
  photoUrl?: string;
  addresses: Endereco[];
}

/** O que `POST /auth/login` devolve e o front guarda em `@ODIN/USER`. */
export interface Sessao {
  access_token: string;
  user: UsuarioDaSessao;
}

export function endereco(overrides: Partial<Endereco> = {}): Endereco {
  return {
    id: 'endereco-casa',
    label: 'Casa',
    street: 'Rua das Flores',
    number: '100',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000000',
    lat: -23.55,
    lng: -46.63,
    isDefault: true,
    active: true,
    ...overrides,
  };
}

export function sessao(
  papel: Papel = 'CLIENTE',
  overrides: Partial<UsuarioDaSessao> = {},
): Sessao {
  const cliente = papel === 'CLIENTE';
  return {
    access_token: `e2e-token-${papel.toLowerCase()}`,
    user: {
      id: cliente ? 'cliente-1' : 'prestador-1',
      name: cliente ? 'Cliente Teste' : 'Prestador Teste',
      email: cliente ? 'cliente@taskgo.test' : 'prestador@taskgo.test',
      phone: '11999999999',
      type: papel,
      addresses: [],
      ...overrides,
    },
  };
}

export function categoria(overrides: Record<string, unknown> = {}) {
  return { id: '1', name: 'Limpeza', slug: 'limpeza', ...overrides };
}

/**
 * Prestador como `GET /provider/:id` e a busca devolvem
 * (`apps/backend/src/modules/provider/mappers/public-provider.mapper.ts`):
 * o usuário vem só com id, nome e foto (sem telefone nem e-mail) e a
 * localização vem arredondada, no máximo uma.
 */
export function prestadorPublico(overrides: Record<string, unknown> = {}) {
  return {
    id: '20',
    bio: 'Especialista em limpeza residencial.',
    ratingAvg: 5,
    ratingCount: 1,
    verified: true,
    acceptPix: true,
    acceptsCard: false,
    emergencyCare: false,
    isAvailable24h: false,
    user: { id: '20', name: 'Ana Limpeza', photoUrl: null },
    services: [
      {
        id: '200',
        providerId: '20',
        title: 'Faxina residencial',
        description: 'Limpeza completa da casa.',
        category: 'limpeza',
        basePrice: 120,
        status: 'ATIVO',
      },
    ],
    locations: [{ lat: -23.55, lng: -46.63 }],
    ...overrides,
  };
}

/** Painel de `GET /auth/provider-home` de uma conta sem movimento. */
export function painelPrestadorVazio() {
  return {
    earnings: { today: 0, month: 0, previousMonth: 0, lastSixMonths: [] },
    services: { completedTotal: 0, completedThisWeek: 0 },
    rating: { average: 0, count: 0 },
    pendingRequests: [],
    activeOrders: [],
    recentServices: [],
    insights: {
      mostRequestedService: null,
      averageTicket: 0,
      mostServedNeighborhood: null,
      monthlyGrowth: null,
    },
  };
}
