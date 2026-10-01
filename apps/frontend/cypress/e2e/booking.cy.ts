/// <reference types="cypress" />

import {
  addresses,
  apiUrl,
  assertOrderCreated,
  availability,
  openBooking,
  openSearch,
  provider,
  stubJourney,
  stubOrderDetails,
} from '../support/customer-journey';

const requestButton = '#booking-request-button';

describe('Seleção de agenda e solicitação de visita', () => {
  beforeEach(() => {
    cy.viewport(1440, 1000);
    stubJourney();
  });

  it('bloqueia dias e horários indisponíveis e limpa o horário ao trocar a data', () => {
    openBooking();
    cy.get(requestButton).should('be.disabled');
    cy.get('.booking-dates button').eq(1).should('be.disabled');
    cy.contains('.booking-slots button', '10:00').should('be.disabled');
    cy.contains('.booking-slots button', '09:00')
      .click()
      .should('have.attr', 'aria-pressed', 'true');
    cy.get(requestButton).should('be.enabled');
    cy.get('.booking-dates button').eq(2).click();
    cy.get(requestButton).should('be.disabled');
    cy.get('.appointment-summary').should('contain.text', 'Selecione um horário');
    cy.contains('.booking-slots button', '14:00').click();
    cy.get('.appointment-summary')
      .should('contain.text', '20 de setembro')
      .and('contain.text', '14:00');
    stubOrderDetails('200', addresses[0].id, availability().days[2].slots[0].startsAt);
    cy.get(requestButton).click();
    assertOrderCreated('200', addresses[0].id, availability().days[2].slots[0].startsAt);
  });

  it('recarrega a agenda ao trocar serviço e envia o endereço escolhido', () => {
    openBooking();
    cy.contains('.booking-slots button', '09:00').click();
    cy.get('.booking-group select').eq(0).select('201');
    cy.wait('@availability')
      .its('request.query')
      .should('include', { serviceId: '201', from: '2026-09-17', to: '2026-09-30' });
    cy.get(requestButton).should('be.disabled');
    cy.get('.appointment-summary')
      .should('contain.text', 'Limpeza de escritório')
      .and('contain.text', '200,00');
    cy.get('.booking-group select').eq(1).select(addresses[1].id);
    cy.contains('.booking-slots button', '09:00').click();
    stubOrderDetails('201', addresses[1].id);
    cy.get(requestButton).click();
    assertOrderCreated('201', addresses[1].id);
    cy.contains('.hero-card', 'Limpeza de escritório').should('be.visible');
  });

  it('impede solicitar sem endereço de atendimento', () => {
    openBooking();
    cy.contains('.booking-slots button', '09:00').click();
    cy.get('.booking-group select').eq(1).select('');
    cy.get(requestButton).should('be.disabled');
    cy.get('@createOrder.all').should('have.length', 0);
    cy.get('.booking-group select').eq(1).select(addresses[0].id);
    cy.get(requestButton).should('be.enabled');
  });

  it('orienta o cliente sem endereços cadastrados', () => {
    cy.intercept('GET', `${apiUrl}/user/me/addresses?limit=100`, { data: [] });
    // Keep search addresses available; only booking requests omit the page parameter.
    openSearch();
    cy.contains('app-card-provider', provider.user.name).contains('button', 'Ver perfil').click();
    cy.wait('@availability');
    cy.contains('Adicione um endereço em Minha conta').should('be.visible');
    cy.contains('.booking-slots button', '09:00').click();
    cy.get(requestButton).should('be.disabled');
    cy.get('@createOrder.all').should('have.length', 0);
  });

  it('mostra agenda sem horários disponíveis', () => {
    cy.intercept('GET', `${apiUrl}/provider/20/availability*`, { ...availability(), days: [] }).as(
      'availability',
    );
    openBooking();
    cy.contains('Nenhum horário disponível para os próximos dias.').should('be.visible');
    cy.get(requestButton).should('be.disabled');
    cy.get('.booking-slots button').should('not.exist');
    cy.get('@createOrder.all').should('have.length', 0);
  });

  it('mostra falha ao carregar agenda sem permitir solicitação', () => {
    cy.intercept('GET', `${apiUrl}/provider/20/availability*`, { statusCode: 503, body: {} }).as(
      'availability',
    );
    openBooking();
    cy.contains('[role="alert"]', 'Não foi possível carregar os horários disponíveis.').should(
      'be.visible',
    );
    cy.get(requestButton).should('be.disabled');
    cy.get('@createOrder.all').should('have.length', 0);
  });

  it('mantém a seleção após conflito e permite escolher outro horário', () => {
    cy.intercept('POST', `${apiUrl}/order`, {
      statusCode: 400,
      body: { message: ['Horário indisponível para agendamento.'] },
    }).as('conflict');
    openBooking();
    cy.contains('.booking-slots button', '09:00').click();
    cy.get(requestButton).click();
    cy.wait('@conflict');
    cy.contains('[role="alert"]', 'Horário indisponível para agendamento.').should('be.visible');
    cy.location('pathname').should('eq', '/customer/20');
    cy.get('.booking-dates button').eq(2).click();
    cy.get('#booking-error-message').should('not.exist');
    cy.contains('.booking-slots button', '14:00').click();
    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 201, body: { id: '900' } }).as(
      'createOrder',
    );
    stubOrderDetails('200', addresses[0].id, availability().days[2].slots[0].startsAt);
    cy.get(requestButton).click();
    assertOrderCreated('200', addresses[0].id, availability().days[2].slots[0].startsAt);
  });

  it('desabilita o envio enquanto a solicitação está em andamento', () => {
    cy.intercept('POST', `${apiUrl}/order`, {
      delay: 1000,
      statusCode: 201,
      body: { id: '900' },
    }).as('createOrder');
    stubOrderDetails();
    openBooking();
    cy.contains('.booking-slots button', '09:00').click();
    cy.get(requestButton).click().should('be.disabled');
    assertOrderCreated();
  });

  it('preserva a seleção e libera nova tentativa após falha do servidor', () => {
    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 500, body: {} }).as('failedOrder');
    openBooking();
    cy.contains('.booking-slots button', '09:00').click();
    cy.get(requestButton).click();
    cy.wait('@failedOrder');
    cy.contains('[role="alert"]', 'Não foi possível criar a solicitação.').should('be.visible');
    cy.get(requestButton).should('be.enabled');
    cy.contains('.booking-slots button', '09:00').should('have.attr', 'aria-pressed', 'true');
    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 201, body: { id: '900' } }).as(
      'createOrder',
    );
    stubOrderDetails();
    cy.get(requestButton).click();
    assertOrderCreated();
  });
});
