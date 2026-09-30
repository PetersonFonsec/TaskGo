import LoginElements from '../support/pages/login';
import RegisterElements from '../support/pages/register';
import RegisterProfileFormElements from '../support/pages/register-profile-form';

/**
 * Jornada de autenticação contra a API real, sem stubs das rotas do backend.
 * Pré-requisitos: backend em `Cypress.env('url')` com banco migrado e seed de
 * categorias, e frontend em `baseUrl`. Apenas a consulta de CEP (serviço externo)
 * é simulada. Execute com `npm run cypress:run:api`.
 */
const apiUrl = Cypress.env('url');

type Role = 'client' | 'provider';

const homeByRole: Record<Role, string> = {
  client: '/customer',
  provider: '/provider',
};

function generateCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const checkDigit = (values: number[]) => {
    const sum = values.reduce(
      (total, value, index) => total + value * (values.length + 1 - index),
      0,
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  digits.push(checkDigit(digits));
  digits.push(checkDigit(digits));
  return digits.join('');
}

function buildUser(role: Role) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: role === 'client' ? 'Cliente E2E' : 'Prestador E2E',
    email: `e2e.${role}.${id}@taskgo.test`,
    password: 'senha-e2e-123',
    cpf: generateCpf(),
    phone: '(11) 91234-5678',
  };
}

function fillProfile(user: ReturnType<typeof buildUser>) {
  const profile = new RegisterProfileFormElements(user);
  cy.get('#profile-step').click();
  cy.url().should('include', '/authenticate/profile');
  profile.fillForm();
  profile.submitButton.should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function fillContact() {
  cy.get('#contact-step').click();
  cy.url().should('include', '/authenticate/contact');
  cy.get('#whatsapp-input').type('11 11 99999-9999');
  cy.contains('#social-form_footer button', 'Salvar').click();
  cy.url().should('include', '/authenticate/register');
}

function fillAddress() {
  cy.intercept('GET', 'https://brasilapi.com.br/api/cep/v2/01001000', {
    cep: '01001-000',
    state: 'SP',
    city: 'São Paulo',
    neighborhood: 'Sé',
    street: 'Praça da Sé',
    latitude: -23.55052,
    longitude: -46.633308,
  }).as('getCep');

  cy.get('#address-step').click();
  cy.url().should('include', '/authenticate/address');
  cy.get('#zipcode-input').type('01001-000').blur();
  cy.wait('@getCep');
  cy.get('#number-input').type('100');
  cy.contains('#address-form_footer button', 'Criar endereço').should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function selectFirstSeededService() {
  cy.intercept('GET', `${apiUrl}/categories*`).as('getCategories');
  cy.get('#category-step').click();
  cy.wait('@getCategories').its('response.statusCode').should('eq', 200);
  cy.get('#category-form_content app-card').first().click();
  cy.contains('#category-form_footer button', 'Selecionar categoria').should('be.enabled').click();
  cy.url().should('match', /\/authenticate\/category\/\d+\/service/);
  cy.get('#service-form_content label.checkbox').first().click();
  cy.contains('#service-form_footer button', 'Adicionar serviços').should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function registerThroughUi(role: Role, user: ReturnType<typeof buildUser>) {
  cy.intercept('POST', `${apiUrl}/auth/register`).as('register');
  const register = new RegisterElements(user);

  if (role === 'provider') {
    cy.visit('/authenticate');
    register.toFormRegisterButton.click();
    cy.url().should('include', '/authenticate/register');
    register.providerBadge.should('have.class', 'selected');
  } else {
    cy.visit('/authenticate/register');
    register.customerBadge.click();
  }

  fillProfile(user);
  fillContact();
  fillAddress();
  if (role === 'provider') selectFirstSeededService();

  register.registerButton.should('be.enabled').click();
  cy.wait('@register').its('response.statusCode').should('eq', 201);

  cy.contains('.full-modal', 'Perfil Criado!!').should('be.visible');
  cy.contains('.full-modal button', 'Acessar Plataforma').click();
  cy.location('pathname').should('eq', homeByRole[role]);
  cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.a', 'string');
}

function loginThroughUi(user: { email: string; password: string }) {
  cy.intercept('POST', `${apiUrl}/auth/login`).as('login');
  cy.visit('/authenticate/login');
  const login = new LoginElements(user);
  login.fillFormValid();
  login.submitButton.should('be.enabled').click();
  return cy.wait('@login');
}

function logout() {
  cy.clearLocalStorage();
  cy.visit('/authenticate/login');
}

describe('Autenticação contra a API real', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('cadastra um cliente, entra novamente e recusa senha incorreta', () => {
    const client = buildUser('client');

    registerThroughUi('client', client);

    logout();
    loginThroughUi(client).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.location('pathname').should('eq', homeByRole.client);
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.a', 'string');

    logout();
    loginThroughUi({ email: client.email, password: 'senha-errada-123' })
      .its('response.statusCode')
      .should('eq', 403);
    cy.get('.alert').should('contain.text', 'Email ou senha incorretos');
    cy.location('pathname').should('eq', '/authenticate/login');
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.null');
  });

  it('cadastra um prestador com serviço do seed e entra novamente', () => {
    const provider = buildUser('provider');

    registerThroughUi('provider', provider);

    logout();
    loginThroughUi(provider).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.location('pathname').should('eq', homeByRole.provider);
  });

  it('recusa um segundo cadastro com o mesmo e-mail', () => {
    const client = buildUser('client');
    registerThroughUi('client', client);
    logout();

    cy.intercept('POST', `${apiUrl}/auth/register`).as('duplicate');
    const register = new RegisterElements(client);
    cy.visit('/authenticate/register');
    register.customerBadge.click();
    fillProfile({ ...client, cpf: generateCpf() });
    fillContact();
    fillAddress();
    register.registerButton.should('be.enabled').click();

    cy.wait('@duplicate').its('response.statusCode').should('be.within', 400, 499);
    register.alertComponent.should('be.visible');
    cy.get('.full-modal').should('not.exist');
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.null');
  });
});
