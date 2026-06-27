/// <reference types="cypress" />

export {};

const apiUrl = Cypress.env('url');

const customer = {
  email: 'cliente1@teste.com',
  password: '123456',
};

const session = {
  access_token: 'customer-e2e-token',
  user: {
    id: '1',
    name: 'Cliente 1',
    email: customer.email,
    type: 'CLIENTE',
    addresses: [
      {
        street: 'Rua dos Clientes 1',
        number: '100',
        city: 'Sao Paulo',
        state: 'SP',
        cep: '01000-000',
        lat: -23.5505,
        lng: -46.6333,
      },
    ],
  },
};

const categories = {
  data: [{ id: '1', name: 'Limpeza', slug: 'limpeza' }],
  meta: { total: 1, page: 1, limit: 10 },
};

const provider = {
  id: '20',
  bio: 'Especialista em limpeza residencial.',
  verified: true,
  ratingAvg: 5,
  locations: [{ lat: -23.551, lng: -46.634 }],
  user: { name: 'Prestador Limpeza', phone: '11999999999', photoUrl: '' },
  reviews: [{ rating: 5, comment: 'Otimo atendimento.' }],
  services: [
    {
      id: '200',
      title: 'Faxina residencial',
      category: 'limpeza',
      basePrice: 120,
    },
  ],
};

const availability = {
  providerId: provider.id,
  timezone: 'America/Sao_Paulo',
  days: [
    {
      date: '2026-07-06',
      available: true,
      slots: [
        {
          startsAt: '2026-07-06T12:00:00.000Z',
          endsAt: '2026-07-06T13:00:00.000Z',
          serviceId: '200',
          label: '09:00',
          available: true,
        },
      ],
    },
  ],
};

describe('Jornada do cliente', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept('POST', `${apiUrl}/auth/login`, {
      statusCode: 201,
      body: session,
    }).as('login');
    cy.intercept('GET', `${apiUrl}/categories*`, {
      statusCode: 200,
      body: categories,
    }).as('categories');
    cy.intercept('GET', `${apiUrl}/order/client/${session.user.id}`, {
      statusCode: 200,
      body: [],
    }).as('orders');
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, {
      statusCode: 200,
      body: [provider],
    }).as('providers');
    cy.intercept('GET', `${apiUrl}/favorites`, {
      statusCode: 200,
      body: { items: [] },
    }).as('favorites');
    cy.intercept('GET', `${apiUrl}/provider/${provider.id}`, {
      statusCode: 200,
      body: provider,
    }).as('provider');
    cy.intercept('GET', `${apiUrl}/provider/${provider.id}/availability*`, {
      statusCode: 200,
      body: availability,
    }).as('availability');
  });

  it('faz login, busca um prestador e solicita um agendamento', () => {
    cy.intercept('POST', `${apiUrl}/order`, {
      statusCode: 201,
      body: { id: '900', status: 'PENDENTE' },
    }).as('createOrder');

    cy.visit('/authenticate/login');
    cy.get('#email input').type(customer.email);
    cy.get('#senha input').type(customer.password);
    cy.get('#login-form_footer button').click();

    cy.wait('@login');
    cy.url().should('include', '/customer');
    cy.contains('Encontre o serviço ideal').should('be.visible');
    cy.contains('a', 'Limpeza').click();

    cy.wait('@providers');
    cy.url().should('include', '/customer/search');
    cy.contains('Prestador Limpeza').should('be.visible');
    cy.contains('button', 'Ver perfil').click();

    cy.wait('@provider');
    cy.wait('@availability');
    cy.url().should('match', /\/customer\/20/);
    cy.contains('Prestador Limpeza').should('be.visible');
    cy.contains('.booking-slots button', '09:00').click();
    cy.get('#booking-request-button').should('be.enabled').click();

    cy.wait('@createOrder')
      .its('request.body')
      .should('deep.include', {
        clientId: session.user.id,
        serviceId: provider.services[0].id,
        scheduledFor: availability.days[0].slots[0].startsAt,
        finalPrice: 120,
        paymentMethod: 'PIX',
      });
    cy.contains('Sua solicitação foi feita').should('be.visible');
  });
});
