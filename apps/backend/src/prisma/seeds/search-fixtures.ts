import { ProviderStatus, ServiceStatus } from '@prisma/client';
import { SBC_LOCATIONS } from './sbc-locations';

// Coordenadas fixas e aproximadas; não dependem de geocodificação externa.
export const SEARCH_LOCATIONS = [
  ...SBC_LOCATIONS.map(({ bairro, lat, lng }) => ({
    neighborhood: bairro,
    city: 'São Bernardo do Campo',
    state: 'SP',
    cep: '09700-000',
    lat,
    lng,
  })),
  {
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    cep: '01001-000',
    lat: -23.5505,
    lng: -46.6333,
  },
  {
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    cep: '05422-000',
    lat: -23.5673,
    lng: -46.7019,
  },
  {
    neighborhood: 'Centro',
    city: 'Santo André',
    state: 'SP',
    cep: '09015-000',
    lat: -23.6639,
    lng: -46.5383,
  },
  {
    neighborhood: 'Centro',
    city: 'São Caetano do Sul',
    state: 'SP',
    cep: '09510-000',
    lat: -23.6229,
    lng: -46.5514,
  },
  {
    neighborhood: 'Centro',
    city: 'Guarulhos',
    state: 'SP',
    cep: '07010-000',
    lat: -23.4543,
    lng: -46.5337,
  },
  {
    neighborhood: 'Centro',
    city: 'Campinas',
    state: 'SP',
    cep: '13010-000',
    lat: -22.9056,
    lng: -47.0608,
  },
  {
    neighborhood: 'Copacabana',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cep: '22040-000',
    lat: -22.9711,
    lng: -43.1822,
  },
  {
    neighborhood: 'Centro',
    city: 'Belo Horizonte',
    state: 'MG',
    cep: '30110-000',
    lat: -19.9191,
    lng: -43.9386,
  },
  {
    neighborhood: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    cep: '80020-000',
    lat: -25.4284,
    lng: -49.2733,
  },
  {
    neighborhood: 'Centro',
    city: 'Manaus',
    state: 'AM',
    cep: '69005-000',
    lat: -3.119,
    lng: -60.0217,
  },
];

export function seedAddress(location: (typeof SEARCH_LOCATIONS)[number]) {
  return {
    ...location,
    street: `Rua de Teste ${location.neighborhood}`,
    number: '100',
  };
}

const SPECIALTIES = [
  [
    'reparo',
    'Instalação elétrica residencial',
    'Reparo hidráulico e vazamentos',
  ],
  ['limpeza', 'Faxina residencial', 'Limpeza pós-obra'],
  ['automotivo', 'Revisão mecânica', 'Chaveiro automotivo'],
  ['beleza-e-cuidados', 'Manicure e pedicure', 'Maquiagem para eventos'],
  ['cuidados-pessoais', 'Cuidador de idosos', 'Babá domiciliar'],
  ['educacao-e-aulas', 'Reforço escolar de matemática', 'Aulas de inglês'],
  ['pets', 'Passeio de cães', 'Banho e tosa'],
  ['eventos-e-lazer', 'Fotografia de eventos', 'Buffet para festas'],
  ['transporte-e-mudancas', 'Carreto e frete', 'Mudança residencial'],
  [
    'tecnologia-e-consultoria',
    'Suporte técnico de computadores',
    'Desenvolvimento de sites',
  ],
] as const;

// 1–20: positivos em todas as categorias e localidades (exceto Manaus).
// 21–30: controles geográficos e de visibilidade, sempre na categoria reparo.
export const SEARCH_PROVIDERS = Array.from({ length: 30 }, (_, i) => {
  const [category, first, second] = SPECIALTIES[i < 20 ? i % 10 : 0];
  const locationIndex = i < 19 ? i : i === 19 ? 10 : 0;
  const status =
    i === 20
      ? ProviderStatus.PENDING
      : i === 21
        ? ProviderStatus.REJECTED
        : i === 22
          ? ProviderStatus.BLOCKED
          : ProviderStatus.APPROVED;
  return {
    locationIndex,
    status,
    radiusKm: i >= 20 ? 5 : [3, 8, 15, 30][i % 4],
    areaActive: i !== 24,
    areaLocationIndices: i === 25 ? [] : i === 26 ? [0, 15] : [locationIndex],
    services: [first, second].map((title, j) => ({
      title,
      category,
      description: `${title}. Atendimento com agendamento em ${SEARCH_LOCATIONS[locationIndex].city}.`,
      basePrice: 60 + (i % 10) * 35 + j * 50,
      status:
        i === 23 || (i === 27 && j === 1)
          ? ServiceStatus.INATIVO
          : ServiceStatus.ATIVO,
    })),
  };
});
