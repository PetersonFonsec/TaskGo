/// <reference types="cypress" />

export const apiUrl = Cypress.env('url');
export const now = new Date('2026-09-17T15:00:00.000Z').getTime();
export const addresses = [
  {
    id: 'address-home',
    label: 'Casa',
    street: 'Rua das Flores',
    number: '100',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000-000',
    lat: -23.55,
    lng: -46.63,
    isDefault: true,
    active: true,
  },
  {
    id: 'address-work',
    label: 'Trabalho',
    street: 'Avenida Paulista',
    number: '200',
    city: 'São Paulo',
    state: 'SP',
    cep: '01310-000',
    lat: -23.56,
    lng: -46.65,
    isDefault: false,
    active: true,
  },
];
export const session = {
  access_token: 'customer-e2e-token',
  user: {
    id: 'client-1',
    name: 'Cliente Teste',
    email: 'cliente@teste.com',
    type: 'CLIENTE',
    addresses,
  },
};
export const provider = {
  id: '20',
  bio: 'Especialista em limpeza residencial.',
  verified: true,
  ratingAvg: 5,
  distanceKm: 2,
  locations: [{ lat: -23.551, lng: -46.634 }],
  user: { name: 'Ana Limpeza', phone: '11999999999', email: 'ana@teste.com', photoUrl: '' },
  reviews: [{ id: 'review-1', rating: 5, comment: 'Excelente atendimento.', authorName: 'Maria' }],
  services: [
    { id: '200', title: 'Faxina residencial', category: 'limpeza', basePrice: 120 },
    { id: '201', title: 'Limpeza de escritório', category: 'limpeza', basePrice: 200 },
  ],
};
export const providers = [
  provider,
  {
    ...provider,
    id: '21',
    locations: [{ lat: -23.58, lng: -46.66 }],
    ratingAvg: 3,
    distanceKm: 8,
    user: { ...provider.user, name: 'Bruno Limpeza' },
    services: [{ ...provider.services[0], id: '210', basePrice: 75 }],
  },
  {
    ...provider,
    id: '22',
    locations: [{ lat: -23.61, lng: -46.69 }],
    ratingAvg: 4,
    distanceKm: 15,
    user: { ...provider.user, name: 'Carla Limpeza' },
    services: [{ ...provider.services[0], id: '220', basePrice: 300 }],
  },
];
export function availability(serviceId = '200') {
  return {
    providerId: provider.id,
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
export function stubJourney() {
  cy.clock(now, ['Date']);
  cy.intercept('POST', `${apiUrl}/auth/login`, { statusCode: 201, body: session }).as('login');
  cy.intercept('GET', `${apiUrl}/categories*`, {
    data: [{ id: '1', name: 'Limpeza', slug: 'limpeza' }],
    meta: { total: 1, page: 1, limit: 10 },
  });
  cy.intercept('GET', `${apiUrl}/user/me/addresses*`, {
    data: addresses,
    meta: { total: 2, page: 1, hasNextPage: false },
  }).as('addresses');
  cy.intercept('GET', `${apiUrl}/order/client/${session.user.id}`, []).as('orders');
  cy.intercept({ method: 'GET', pathname: '/provider' }, { body: providers }).as('allProviders');
  cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, { body: providers }).as(
    'providers',
  );
  cy.intercept('GET', `${apiUrl}/favorites`, { items: [] });
  cy.intercept('GET', `${apiUrl}/provider/${provider.id}`, provider).as('provider');
  cy.intercept('GET', `${apiUrl}/provider/${provider.id}/availability*`, (req) => {
    req.reply(availability(String(req.query['serviceId'])));
  }).as('availability');
  // Prevent map tiles and telemetry from depending on external services.
  cy.intercept('GET', 'https://*.tile.openstreetmap.org/**', { statusCode: 204 });
  cy.intercept('POST', 'http://localhost:4318/**', { statusCode: 200 });
  cy.intercept('POST', `${apiUrl}/order`, {
    statusCode: 201,
    body: { id: '900', status: 'PENDENTE' },
  }).as('createOrder');
}
export function login() {
  cy.visit('/authenticate/login');
  cy.get('#email input').type(session.user.email);
  cy.get('#senha input').type('123456');
  cy.get('#login-form_footer button').click();
  cy.wait('@login');
  cy.location('pathname').should('eq', '/customer');
}
export function openSearch() {
  login();
  cy.contains('a', 'Limpeza').click();
  cy.wait('@providers');
  cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
}
export function openBooking() {
  openSearch();
  cy.contains('app-card-provider', provider.user.name).contains('button', 'Ver perfil').click();
  cy.wait('@provider');
  cy.wait('@availability');
  cy.get('.booking-group select').eq(1).should('have.value', addresses[0].id);
}
export function stubOrderDetails(
  serviceId = '200',
  addressId = addresses[0].id,
  scheduledFor = availability().days[0].slots[0].startsAt,
) {
  const service = provider.services.find((item) => item.id === serviceId)!;
  cy.intercept('GET', `${apiUrl}/orders/900`, {
    id: '900',
    status: 'PENDENTE',
    service,
    provider: { ...provider.user, verified: true, ratingAvg: 5, ratingCount: 1 },
    client: session.user,
    address: addresses.find((item) => item.id === addressId),
    schedule: { requestedAt: new Date(now).toISOString(), scheduledFor },
    payment: null,
    timeline: [],
  }).as('orderDetails');
}
export function assertOrderCreated(
  serviceId = '200',
  addressId = addresses[0].id,
  scheduledFor = availability().days[0].slots[0].startsAt,
) {
  cy.wait('@createOrder')
    .its('request.body')
    .should('deep.equal', { serviceId, addressId, scheduledFor });
  cy.wait('@orderDetails');
  cy.location('pathname').should('eq', '/orders/900');
  cy.contains('h1', 'Detalhes do pedido').should('be.visible');
  cy.get('[data-status="PENDENTE"]').should('be.visible');
  cy.contains('.hero-card', provider.user.name).should('be.visible');
  cy.contains('.details-grid', addresses.find((item) => item.id === addressId)!.street).should(
    'be.visible',
  );
  cy.get('@createOrder.all').should('have.length', 1);
}
