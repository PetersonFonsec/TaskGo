import LoginElements from '../../support/pages/login';
import RegisterElements from '../../support/pages/register';
import { preencherContato, preencherEndereco, preencherPerfil } from '../../support/fluxos/cadastro';

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
    phone: '(11) 9 1234-5678',
  };
}

function selectFirstSeededService() {
  cy.intercept('GET', `${apiUrl}/categories*`).as('getCategories');
  cy.get('#category-step').click();
  cy.wait('@getCategories').its('response.statusCode').should('be.oneOf', [200, 304]);
  cy.get('#category-list label').first().click();
  cy.get('#category-submit').click();
  cy.url().should('match', /\/authenticate\/category\/\d+\/service/);
  cy.get('#service-list label').first().click();
  cy.get('#services-submit').click();
  cy.url().should('include', '/authenticate/register');
}

function registerThroughUi(role: Role, user: ReturnType<typeof buildUser>) {
  cy.intercept('POST', `${apiUrl}/auth/register`).as('register');
  const register = new RegisterElements(user);

  if (role === 'provider') {
    cy.visit('/authenticate');
    register.toFormRegisterButton.click();
    cy.url().should('include', '/authenticate/register');
    register.providerChoice.click();
    register.providerChoice.find('input').should('be.checked');
  } else {
    cy.visit('/authenticate/register');
    register.customerChoice.click();
  }

  preencherPerfil(user);
  preencherContato();
  preencherEndereco();
  if (role === 'provider') selectFirstSeededService();

  register.registerButton.should('be.enabled').click();
  cy.wait('@register').its('response.statusCode').should('eq', 201);

  cy.contains('h1', 'Conta criada').should('be.visible');
  cy.get('#register-done-home').click();
  cy.location('pathname').should('eq', homeByRole[role]);
  cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.a', 'string');
}

function loginThroughUi(user: { email: string; password: string }) {
  cy.intercept('POST', `${apiUrl}/auth/login`).as('login');
  cy.visit('/authenticate/login');
  const login = new LoginElements(user);
  // O autofocus do e-mail só acontece depois da hidratação. Texto digitado
  // antes disso se perde, então espera a página ficar interativa.
  login.emailInput.should('have.focus');
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
    cy.get('tg-alert').should('contain.text', 'Email ou senha incorretos');
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
    register.customerChoice.click();
    preencherPerfil({ ...client, cpf: generateCpf() });
    preencherContato();
    preencherEndereco();
    register.registerButton.should('be.enabled').click();

    cy.wait('@duplicate').its('response.statusCode').should('be.within', 400, 499);
    register.alertComponent.should('be.visible');
    cy.contains('h1', 'Conta criada').should('not.exist');
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.null');
  });
});
