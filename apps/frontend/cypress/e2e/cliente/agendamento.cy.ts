/// <reference types="cypress" />

import {
  agenda,
  conferirPedidoCriado,
  enderecos,
  entrarNaJornada,
  responderPedidoCriado,
  ultimoHorario,
} from '../../support/api/jornada-cliente';
import { apiUrl } from '../../support/api/stub-base';

/**
 * Agendamento em `/customer/:id` (tela ainda fora do Design System) até o
 * pedido criado em `/orders/:id`.
 */
const solicitar = '#booking-request-button';
const servico = () => cy.get('.booking-group select').eq(0);
const endereco = () => cy.get('.booking-group select').eq(1);
const horario = (label: string) => cy.contains('.booking-slots button', label);
const datas = () => cy.get('.booking-dates button');

function abrirAgendamento(preparar?: () => void) {
  entrarNaJornada('/customer/20', preparar);
  cy.wait('@prestador');
  cy.wait('@agenda');
  endereco().should('have.value', enderecos[0].id);
}

describe('Agendamento de visita', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
  });

  [
    { nome: 'no computador', largura: 1280, altura: 900 },
    { nome: 'no celular', largura: 390, altura: 844 },
  ].forEach(({ nome, largura, altura }) => {
    it(`solicita uma visita com o primeiro horário livre ${nome}`, () => {
      cy.viewport(largura, altura);
      responderPedidoCriado();
      abrirAgendamento();

      cy.get(solicitar).should('be.disabled');
      horario('09:00').click().should('have.attr', 'aria-pressed', 'true');
      cy.get('.appointment-summary')
        .should('contain.text', 'Faxina residencial')
        .and('contain.text', '09:00')
        .and('contain.text', '120,00');
      cy.get(solicitar).should('be.enabled').click();

      conferirPedidoCriado();
    });
  });

  it('abre o perfil completo e volta para agendar', () => {
    abrirAgendamento();

    cy.contains('button', 'Ver Perfil Completo').click();
    cy.location('pathname').should('eq', '/customer/profile/20');
    cy.findByRole('heading', { level: 1, name: 'Ana Limpeza' }).should('be.visible');
    cy.contains('Faxina residencial').should('be.visible');
    cy.findByRole('link', { name: 'Agendar serviço' }).click();
    cy.location('pathname').should('eq', '/customer/20');
    cy.wait('@agenda');
  });

  it('bloqueia dias e horários indisponíveis e limpa o horário ao trocar a data', () => {
    responderPedidoCriado('200', enderecos[0].id, ultimoHorario);
    abrirAgendamento();

    datas().eq(1).should('be.disabled');
    horario('10:00').should('be.disabled');
    horario('09:00').click();
    cy.get(solicitar).should('be.enabled');

    datas().eq(2).click();
    cy.get(solicitar).should('be.disabled');
    cy.get('.appointment-summary').should('contain.text', 'Selecione um horário');
    horario('14:00').click();
    cy.get('.appointment-summary').should('contain.text', '20 de set').and('contain.text', '14:00');
    cy.get(solicitar).click();

    conferirPedidoCriado('200', enderecos[0].id, ultimoHorario);
  });

  it('recarrega a agenda ao trocar o serviço e envia o endereço escolhido', () => {
    responderPedidoCriado('201', enderecos[1].id);
    abrirAgendamento();

    horario('09:00').click();
    servico().select('201');
    cy.wait('@agenda')
      .its('request.query')
      .should('include', { serviceId: '201', from: '2026-09-17', to: '2026-09-30' });
    cy.get(solicitar).should('be.disabled');
    cy.get('.appointment-summary')
      .should('contain.text', 'Limpeza de escritório')
      .and('contain.text', '200,00');

    endereco().select(enderecos[1].id);
    horario('09:00').click();
    cy.get(solicitar).click();

    conferirPedidoCriado('201', enderecos[1].id);
  });

  it('não deixa solicitar sem endereço de atendimento', () => {
    abrirAgendamento();

    horario('09:00').click();
    endereco().select('');
    cy.get(solicitar).should('be.disabled');
    endereco().select(enderecos[0].id);
    cy.get(solicitar).should('be.enabled');
    cy.get('@criarPedido.all').should('have.length', 0);
  });

  it('orienta o cliente sem endereços cadastrados', () => {
    entrarNaJornada('/customer/20', undefined, []);
    cy.wait('@agenda');

    cy.contains('Adicione um endereço em Minha conta').should('be.visible');
    horario('09:00').click();
    cy.get(solicitar).should('be.disabled');
  });

  it('avisa quando não há horários nos próximos dias', () => {
    abrirAgendamento(() => {
      cy.intercept('GET', `${apiUrl}/provider/20/availability*`, { ...agenda(), days: [] }).as(
        'agenda',
      );
    });

    cy.contains('Nenhum horário disponível para os próximos dias.').should('be.visible');
    cy.get('.booking-slots button').should('not.exist');
    cy.get(solicitar).should('be.disabled');
  });

  it('mostra a falha ao carregar a agenda sem permitir solicitar', () => {
    abrirAgendamento(() => {
      cy.intercept('GET', `${apiUrl}/provider/20/availability*`, { statusCode: 503, body: {} }).as(
        'agenda',
      );
    });

    cy.contains('[role="alert"]', 'Não foi possível carregar os horários disponíveis.').should(
      'be.visible',
    );
    cy.get(solicitar).should('be.disabled');
  });

  it('mantém a tela após conflito de horário e aceita outro horário', () => {
    responderPedidoCriado('200', enderecos[0].id, ultimoHorario);
    abrirAgendamento(() => {
      cy.intercept('POST', `${apiUrl}/order`, {
        statusCode: 400,
        body: { message: ['Horário indisponível para agendamento.'] },
      }).as('conflito');
    });

    horario('09:00').click();
    cy.get(solicitar).click();
    cy.wait('@conflito');
    cy.contains('[role="alert"]', 'Horário indisponível para agendamento.').should('be.visible');
    cy.location('pathname').should('eq', '/customer/20');

    datas().eq(2).click();
    cy.get('#booking-error-message').should('not.exist');
    horario('14:00').click();
    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 201, body: { id: '900' } }).as(
      'criarPedido',
    );
    cy.get(solicitar).click();

    conferirPedidoCriado('200', enderecos[0].id, ultimoHorario);
  });

  it('bloqueia o botão enquanto a solicitação é enviada', () => {
    responderPedidoCriado();
    abrirAgendamento(() => {
      cy.intercept('POST', `${apiUrl}/order`, {
        delay: 1000,
        statusCode: 201,
        body: { id: '900' },
      }).as('criarPedido');
    });

    horario('09:00').click();
    cy.get(solicitar).click().should('be.disabled');

    conferirPedidoCriado();
  });

  it('mantém a seleção e permite tentar de novo após erro do servidor', () => {
    responderPedidoCriado();
    abrirAgendamento(() => {
      cy.intercept('POST', `${apiUrl}/order`, { statusCode: 500, body: {} }).as('falha');
    });

    horario('09:00').click();
    cy.get(solicitar).click();
    cy.wait('@falha');
    cy.contains('[role="alert"]', 'Não foi possível criar a solicitação.').should('be.visible');
    cy.get(solicitar).should('be.enabled');
    horario('09:00').should('have.attr', 'aria-pressed', 'true');

    cy.intercept('POST', `${apiUrl}/order`, { statusCode: 201, body: { id: '900' } }).as(
      'criarPedido',
    );
    cy.get(solicitar).click();

    conferirPedidoCriado();
  });
});
