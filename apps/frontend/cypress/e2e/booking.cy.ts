/// <reference types="cypress" />

const apiUrl = Cypress.env('url');

const customerSession = {
  access_token: 'customer-token',
  user: {
    id: 'client-1',
    name: 'Cliente Teste',
    email: 'cliente@taskgo.com',
    type: 'CLIENTE',
    addresses: [
      {
        street: 'Rua A',
        number: '100',
        complement: '',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        cep: '01000-000',
        lat: -23.5,
        lng: -46.6,
      },
    ],
  },
};

const providerProfile = {
  id: '1',
  user: {
    name: 'Provider Agenda',
    photoUrl: '',
  },
  bio: 'Atendimento residencial com agenda online.',
  reviews: [{ rating: 5, comment: 'Excelente atendimento.' }],
  services: [{ id: 's1', title: 'Faxina residencial', basePrice: 120 }],
};

const availability = {
  providerId: '1',
  timezone: 'America/Sao_Paulo',
  days: [
    {
      date: '2026-06-22',
      available: true,
      slots: [
        {
          startsAt: '2026-06-22T12:00:00.000Z',
          endsAt: '2026-06-22T13:00:00.000Z',
          serviceId: 's1',
          label: '09:00',
          available: true,
        },
      ],
    },
  ],
};

function visitBookingPage() {
  cy.intercept('GET', `${apiUrl}/provider/1`, {
    statusCode: 200,
    body: providerProfile,
  }).as('getProvider');

  cy.intercept('GET', `${apiUrl}/provider/1/availability*`, {
    statusCode: 200,
    body: availability,
  }).as('getAvailability');

  cy.intercept('GET', `${apiUrl}/favorites`, {
    statusCode: 200,
    body: { items: [] },
  }).as('favoritesList');

  cy.intercept('GET', `${apiUrl}/order/client/client-1`, {
    statusCode: 200,
    body: [],
  }).as('customerOrders');

  cy.intercept('GET', `${apiUrl}/categories`, {
    statusCode: 200,
    body: { data: [], meta: { total: 0, page: 1, limit: 10 } },
  }).as('categories');

  cy.visit('http://localhost:4200/authenticate/login', {
    onBeforeLoad(win) {
      win.localStorage.setItem('@ODIN/TOKEN', customerSession.access_token);
      win.localStorage.setItem('@ODIN/USER', JSON.stringify(customerSession));
    },
  });

  cy.window().then((win) => {
    win.localStorage.setItem('@ODIN/TOKEN', customerSession.access_token);
    win.localStorage.setItem('@ODIN/USER', JSON.stringify(customerSession));
  });

  cy.visit('http://localhost:4200/customer');
  cy.wait('@customerOrders');

  cy.window().then((win) => {
    win.history.pushState({}, '', '/customer/1');
    win.dispatchEvent(new PopStateEvent('popstate'));
  });

  cy.wait('@getProvider');
  cy.wait('@getAvailability');
  cy.wait('@favoritesList');
}

describe('Booking flow', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('loads availability, selects a slot, and requests an appointment', () => {
    cy.intercept('POST', `${apiUrl}/order`, {
      statusCode: 201,
      body: { id: 'order-1' },
    }).as('createOrder');

    visitBookingPage();

    cy.contains('Provider Agenda').should('be.visible');
    cy.contains('Faxina residencial').should('be.visible');
    cy.contains('.booking-slots button', '09:00').click();
    cy.get('.appointment-summary').within(() => {
      cy.contains('Faxina residencial').should('be.visible');
      cy.contains('09:00').should('be.visible');
      cy.contains('R$ 120,00').should('be.visible');
    });

    cy.get('#booking-request-button').should('be.enabled').click();

    cy.wait('@createOrder')
      .its('request.body')
      .should('deep.include', {
        clientId: 'client-1',
        serviceId: 's1',
        scheduledFor: '2026-06-22T12:00:00.000Z',
        finalPrice: 120,
        paymentMethod: 'PIX',
      });

    cy.contains('Sua solicitação foi feita').should('be.visible');
  });

  it('shows an unavailable-slot error when the selected slot is occupied', () => {
    cy.intercept('POST', `${apiUrl}/order`, {
      statusCode: 400,
      body: { message: ['Horário indisponível para agendamento.'] },
    }).as('createOrderUnavailable');

    visitBookingPage();

    cy.contains('.booking-slots button', '09:00').click();
    cy.get('#booking-request-button').click();

    cy.wait('@createOrderUnavailable');
    cy.contains('Horário indisponível para agendamento.').should('be.visible');
    cy.get('#booking-title').should('contain.text', 'Provider Agenda');
  });
});
