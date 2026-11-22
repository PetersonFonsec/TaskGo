/// <reference types="cypress" />

import RegisterProfileFormElements from '../pages/register-profile-form';

/** Passos do cadastro, usados pelos specs com mocks e contra a API real. */

export interface DadosDeCadastro {
  name: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
}

/** A consulta de CEP é um serviço externo e é sempre simulada. */
export const respostaCep = {
  cep: '01001-000',
  state: 'SP',
  city: 'São Paulo',
  neighborhood: 'Sé',
  street: 'Praça da Sé',
  latitude: -23.55052,
  longitude: -46.633308,
};

export function preencherPerfil(usuario: DadosDeCadastro) {
  const perfil = new RegisterProfileFormElements(usuario);

  cy.get('#profile-step').click();
  cy.url().should('include', '/authenticate/profile');
  perfil.fillForm();
  perfil.submitButton.click();
  cy.url().should('include', '/authenticate/register');
}

/** `completo`: preenche e confere as redes sociais além do WhatsApp. */
export function preencherContato({ completo = false } = {}) {
  cy.get('#contact-step').click();
  cy.url().should('include', '/authenticate/contact');
  cy.get('#whatsapp-input').type('11999999999');
  if (completo) {
    cy.get('#instagram-input').type('@taskgo').should('have.value', 'taskgo');
    cy.get('#facebook-input').type('taskgo');
    cy.get('#linkedin-input').type('taskgo');
  }
  cy.get('#social-submit').click();
  cy.url().should('include', '/authenticate/register');
}

/** `completo`: confere o preenchimento pelo CEP e informa o complemento. */
export function preencherEndereco({ completo = false } = {}) {
  cy.intercept('GET', 'https://brasilapi.com.br/api/cep/v2/01001000', respostaCep).as('getCep');

  cy.get('#address-step').click();
  cy.url().should('include', '/authenticate/address');
  cy.get('#zipcode-input').type('01001-000').blur();
  cy.wait('@getCep');
  if (completo) {
    cy.get('#street-input').should('have.value', respostaCep.street);
    cy.get('#neighborhood-input').should('have.value', respostaCep.neighborhood);
  }
  cy.get('#number-input').type('100');
  if (completo) {
    cy.get('#complement-input').type('Sala 1');
  }
  cy.get('#address-submit').click();
  cy.url().should('include', '/authenticate/register');
}
