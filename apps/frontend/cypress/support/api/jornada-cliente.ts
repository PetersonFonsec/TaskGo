/// <reference types="cypress" />

import { endereco, pedido, prestadorPublico } from './fabricas';
import { apiUrl } from './stub-base';

/**
 * Dados da jornada do cliente: busca por categoria, perfil do profissional,
 * agendamento e o pedido criado. O relógio fica em 17/09/2026 para as datas
 * da agenda caírem dentro dos 14 dias que o front consulta.
 */

export const agora = new Date('2026-09-17T15:00:00.000Z').getTime();

export const enderecos = [
  endereco(),
  endereco({
    id: 'endereco-trabalho',
    label: 'Trabalho',
    street: 'Avenida Paulista',
    number: '200',
    cep: '01310000',
    lat: -23.56,
    lng: -46.65,
    isDefault: false,
  }),
];

const ana = prestadorPublico({
  distanceKm: 2,
  services: [
    { ...prestadorPublico().services[0] },
    {
      id: '201',
      providerId: '20',
      title: 'Limpeza de escritório',
      description: 'Limpeza de salas comerciais.',
      category: 'limpeza',
      basePrice: 200,
      status: 'ATIVO',
    },
  ],
});

/** Mais próximos primeiro: Ana (2 km, nota 5, R$ 120), Bruno (8 km, nota 3, R$ 75), Carla (15 km, nota 4, R$ 300). */
export const prestadores = [
  ana,
  prestadorPublico({
    id: '21',
    ratingAvg: 3,
    distanceKm: 8,
    user: { id: '21', name: 'Bruno Limpeza', photoUrl: null },
    services: [{ ...ana.services[0], id: '210', providerId: '21', basePrice: 75 }],
    locations: [{ lat: -23.58, lng: -46.66 }],
  }),
  prestadorPublico({
    id: '22',
    ratingAvg: 4,
    distanceKm: 15,
    user: { id: '22', name: 'Carla Limpeza', photoUrl: null },
    services: [{ ...ana.services[0], id: '220', providerId: '22', basePrice: 300 }],
    locations: [{ lat: -23.61, lng: -46.69 }],
  }),
];

export const prestador = ana;

export function agenda(serviceId = '200') {
  return {
    providerId: '20',
    timezone: 'America/Sao_Paulo',
    days: [
      {
        date: '2026-09-18',
        available: true,
        slots: [
          {
            startsAt: '2026-09-18T12:00:00.000Z',
            endsAt: '2026-09-18T13:00:00.000Z',
            serviceId,
            label: '09:00',
            available: true,
          },
          {
            startsAt: '2026-09-18T13:00:00.000Z',
            endsAt: '2026-09-18T14:00:00.000Z',
            serviceId,
            label: '10:00',
            available: false,
          },
        ],
      },
      { date: '2026-09-19', available: false, slots: [] },
      {
        date: '2026-09-20',
        available: true,
        slots: [
          {
            startsAt: '2026-09-20T17:00:00.000Z',
            endsAt: '2026-09-20T18:00:00.000Z',
            serviceId,
            label: '14:00',
            available: true,
          },
        ],
      },
    ],
  };
}

export const primeiroHorario = agenda().days[0].slots[0].startsAt;
export const ultimoHorario = agenda().days[2].slots[0].startsAt;

/**
 * Entra como cliente com os dois endereços e responde à busca, ao perfil, à
 * agenda e à criação do pedido. Os aliases: `@prestadores` (busca por
 * categoria), `@todos` (busca sem categoria), `@prestador`, `@agenda`,
 * `@criarPedido`. `preparar` roda depois desses stubs e do `stubBase`, antes
 * de abrir a tela, para trocar qualquer resposta (o último `cy.intercept`
 * registrado vence). Para mudar os endereços da sessão, use `enderecosDaSessao`.
 */
export function entrarNaJornada(
  caminho: string,
  preparar?: () => void,
  enderecosDaSessao = enderecos,
) {
  cy.clock(agora, ['Date']);
  return cy.entrarComo('CLIENTE', caminho, { addresses: enderecosDaSessao }, () => {
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, prestadores).as('prestadores');
    cy.intercept({ method: 'GET', pathname: '/provider' }, prestadores).as('todos');
    cy.intercept('GET', `${apiUrl}/provider/20`, prestador).as('prestador');
    cy.intercept('GET', `${apiUrl}/provider/20/availability*`, (req) => {
      req.reply(agenda(String(req.query['serviceId'])));
    }).as('agenda');
    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 201, body: { id: '900' } }).as(
      'criarPedido',
    );
    preparar?.();
  });
}

/** Responde a `GET /orders/900` com o pedido que acabou de ser criado. */
export function responderPedidoCriado(
  serviceId = '200',
  addressId = enderecos[0].id,
  scheduledFor = primeiroHorario,
) {
  const servico = prestador.services.find((item) => item.id === serviceId)!;
  const local = enderecos.find((item) => item.id === addressId)!;
  cy.intercept(
    'GET',
    `${apiUrl}/orders/900`,
    pedido({
      service: {
        id: servico.id,
        title: servico.title,
        category: servico.category,
        estimatedPrice: servico.basePrice,
      },
      schedule: { requestedAt: new Date(agora).toISOString(), scheduledFor, scheduledEnd: null },
      address: {
        street: local.street,
        number: local.number,
        complement: null,
        neighborhood: null,
        city: local.city,
        state: local.state,
        cep: local.cep,
      },
    }),
  ).as('pedidoCriado');
}

/** Confere o corpo de `POST /order`, um único envio, e a tela do pedido criado. */
export function conferirPedidoCriado(
  serviceId = '200',
  addressId = enderecos[0].id,
  scheduledFor = primeiroHorario,
) {
  cy.wait('@criarPedido')
    .its('request.body')
    .should('deep.equal', { serviceId, addressId, scheduledFor });
  cy.wait('@pedidoCriado');
  cy.location('pathname').should('eq', '/orders/900');
  const servico = prestador.services.find((item) => item.id === serviceId)!;
  cy.findByRole('heading', { level: 1, name: servico.title }).should('be.visible');
  cy.contains('tg-badge', 'Aguardando o profissional').should('be.visible');
  cy.contains(enderecos.find((item) => item.id === addressId)!.street).should('be.visible');
  cy.contains('Ana Limpeza').should('be.visible');
  cy.get('@criarPedido.all').should('have.length', 1);
}

/**
 * Espera a busca pelo endereço principal ter resposta. A tela busca uma vez
 * ao abrir e outra quando os endereços chegam; depois dessa segunda, só
 * busca de novo por uma ação da pessoa. Então, registrado um alias novo
 * depois daqui, a primeira chamada dele é a da ação que o teste fez.
 */
export function esperarBuscaInicial(alias = '@prestadores') {
  cy.get(`${alias}.all`).should((chamadas: any) => {
    const principal = chamadas.find(
      (c: any) => c.request.query.lat === String(enderecos[0].lat) && c.response,
    );
    expect(principal, 'busca pelo endereço principal respondida').to.exist;
  });
}

/**
 * Uma resposta que só sai quando o teste mandar, para simular a rede
 * entregando fora de ordem sem esperar tempo fixo. No handler do
 * `cy.intercept`: `return segurada.pronta.then(() => req.reply(...))`.
 */
export function respostaSegurada() {
  let liberar!: () => void;
  const pronta = new Promise<void>((resolve) => (liberar = resolve));
  return { pronta, liberar: () => liberar() };
}

/**
 * Espera a chamada que casa com `filtro` terminar: respondida ou cancelada
 * pela tela (a busca nova cancela a anterior). Só depois disso dá para
 * afirmar que uma resposta atrasada não mudou a tela.
 */
export function esperarEncerrada(alias: string, filtro: (chamada: any) => boolean) {
  cy.get(`${alias}.all`).should((chamadas: any) => {
    const chamada = chamadas.find(filtro);
    expect(chamada, 'chamada atrasada').to.exist;
    expect(chamada.state).to.be.oneOf(['Complete', 'Errored']);
  });
}
