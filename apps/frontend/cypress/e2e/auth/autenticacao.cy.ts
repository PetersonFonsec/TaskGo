import LoginElements from '../../support/pages/login';
import RegisterElements from '../../support/pages/register';
import RegisterProfileFormElements from '../../support/pages/register-profile-form';
import {
  preencherContato,
  preencherEndereco,
  preencherPerfil,
  respostaCep,
} from '../../support/fluxos/cadastro';
import { painelPrestadorVazio } from '../../support/api/fabricas';

const apiUrl = Cypress.env('url');

const client = {
  name: 'Cliente Teste',
  email: 'cliente.teste@taskgo.com',
  password: 'senha-cliente-123',
  cpf: '529.982.247-25',
  phone: '(11) 9 1234-5678',
};

const provider = {
  name: 'Prestador Teste',
  email: 'prestador.teste@taskgo.com',
  password: 'senha-prestador-123',
  cpf: '123.456.789-09',
  phone: '(11) 9 2345-6789',
};

const authResponses = {
  client: {
    access_token: 'client-token',
    user: {
      id: 'client-1',
      name: client.name,
      email: client.email,
      phone: client.phone,
      cpf: client.cpf,
      type: 'CLIENTE',
      addresses: [],
      orders: [],
      reviews: [],
      provider: null,
    },
  },
  provider: {
    access_token: 'provider-token',
    user: {
      id: 'provider-1',
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      cpf: provider.cpf,
      type: 'PRESTADOR',
      addresses: [],
      orders: [],
      reviews: [],
      provider: null,
    },
  },
};

const categoriesResponse = {
  data: [
    {
      id: 1,
      name: 'Limpeza',
      slug: 'limpeza',
      description: 'Serviços de limpeza',
      icon: 'cleaning',
      sortOrder: 1,
      isActive: true,
      createdAt: {},
      updatedAt: {},
      platformFeePct: null,
    },
  ],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
  },
};

const categoryDetailsResponse = {
  ...categoriesResponse.data[0],
  subcategories: [
    {
      id: 11,
      categoryId: 1,
      name: 'Faxina residencial',
      slug: 'faxina-residencial',
      description: 'Limpeza residencial',
      icon: 'cleaning',
      sortOrder: 1,
      isActive: true,
      createdAt: {},
      updatedAt: {},
    },
  ],
};

function visitAuth(path = '/authenticate') {
  cy.visit(path);
}

function fillProviderService() {
  cy.intercept('GET', `${apiUrl}/categories`, categoriesResponse).as('getCategories');
  cy.intercept('GET', `${apiUrl}/categories/1`, categoryDetailsResponse).as('getCategoryDetails');

  cy.get('#category-step').click();
  cy.url().should('include', '/authenticate/category');
  cy.wait('@getCategories');
  cy.get('#category-submit').click();
  cy.contains('tg-alert', 'Escolha uma categoria').should('be.visible');
  cy.contains('#category-list label', 'Limpeza').click();
  cy.get('#category-1 input[type=radio]').should('be.checked');
  cy.get('#category-submit').click();

  cy.url().should('include', '/authenticate/category/1/service');
  cy.wait('@getCategoryDetails');
  cy.contains('#service-list label', 'Faxina residencial').click();
  cy.get('#service-list input[type=checkbox]').should('be.checked');
  cy.contains('#service-list label', 'Faxina residencial').click();
  cy.get('#service-list input[type=checkbox]').should('not.be.checked');
  cy.get('#services-submit').click();
  cy.contains('tg-alert', 'Escolha pelo menos um serviço').should('be.visible');
  cy.contains('#service-list label', 'Faxina residencial').click();
  cy.get('#services-submit').click();
  cy.url().should('include', '/authenticate/register');
}

function assertRegisteredSession(role: 'client' | 'provider') {
  const response = authResponses[role];
  const path = role === 'client' ? '/customer' : '/provider';
  cy.contains('h1', 'Conta criada').should('be.visible').and('have.focus');
  cy.get('#register-done-primary').should(
    'have.attr',
    'href',
    role === 'client' ? '/customer/search' : '/provider/services',
  );
  cy.get('#register-done-home').click();
  cy.location('pathname').should('eq', path);
  cy.window().then((win) => {
    expect(win.localStorage.getItem('@ODIN/TOKEN')).to.equal(response.access_token);
    expect(JSON.parse(win.localStorage.getItem('@ODIN/USER')!).user.type).to.equal(
      response.user.type,
    );
  });
  cy.reload();
  cy.location('pathname').should('eq', path);
}

beforeEach(() => {
  cy.intercept('GET', `${apiUrl}/order/client/*`, []).as('customerOrders');
  cy.intercept('GET', `${apiUrl}/order/provider/*`, []).as('providerOrders');
  cy.intercept('GET', `${apiUrl}/categories*`, categoriesResponse);
  cy.intercept('GET', `${apiUrl}/favorites`, { items: [] });
  cy.intercept('GET', `${apiUrl}/user/me/addresses*`, {
    data: [],
    meta: { total: 0, page: 1, limit: 1, hasNextPage: false },
  });
  cy.intercept('GET', `${apiUrl}/auth/provider-home`, painelPrestadorVazio());
});

describe('Autenticação', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('valida campos obrigatórios do login ao enviar', () => {
    cy.intercept('POST', `${apiUrl}/auth/login`, cy.spy().as('loginRequest'));
    visitAuth('/authenticate/login');

    const login = new LoginElements(client);
    login.submitButton.should('be.enabled').click();
    cy.contains('.tg-field__error', 'Informe seu e-mail.').should('be.visible');
    cy.contains('.tg-field__error', 'Informe sua senha.').should('be.visible');
    login.emailInput.should('have.focus').and('have.attr', 'aria-invalid', 'true');

    login.emailInput.type('email-invalido');
    login.passwordInput.type(client.password);
    login.submitButton.click();
    cy.contains('.tg-field__error', 'Informe um e-mail válido').should('be.visible');
    login.emailInput.should('have.focus');
    cy.get('@loginRequest').should('not.have.been.called');
  });

  it('exibe erro quando as credenciais são inválidas', () => {
    cy.intercept('POST', `${apiUrl}/auth/login`, {
      statusCode: 401,
      body: { message: 'Email ou senha incorretos' },
    }).as('loginError');

    visitAuth('/authenticate/login');

    const login = new LoginElements(client);
    login.fillFormValid();
    login.submitButton.click();

    cy.wait('@loginError')
      .its('request.body')
      .should('deep.equal', { email: client.email, password: client.password });
    login.alertComponent.should('contain.text', 'Email ou senha incorretos');
    cy.location('pathname').should('eq', '/authenticate/login');
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.null');
  });

  it('autentica cliente e redireciona para a área do cliente', () => {
    cy.intercept('POST', `${apiUrl}/auth/login`, {
      statusCode: 200,
      body: authResponses.client,
    }).as('loginClient');

    visitAuth('/authenticate/login');

    const login = new LoginElements(client);
    login.fillFormValid();
    login.submitButton.click();

    cy.wait('@loginClient');
    cy.url().should('include', '/customer');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('@ODIN/TOKEN')).to.equal(authResponses.client.access_token);
    });
  });

  it('autentica prestador e redireciona para a área do prestador', () => {
    cy.intercept('POST', `${apiUrl}/auth/login`, {
      statusCode: 200,
      body: authResponses.provider,
    }).as('loginProvider');

    visitAuth('/authenticate/login');

    const login = new LoginElements(provider);
    login.fillFormValid();
    login.submitButton.click();

    cy.wait('@loginProvider');
    cy.url().should('include', '/provider');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('@ODIN/TOKEN')).to.equal(authResponses.provider.access_token);
    });
  });
});

describe('Cadastro de usuários', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('impede salvar perfil com senhas diferentes', () => {
    visitAuth('/authenticate/profile');
    const profile = new RegisterProfileFormElements(client);
    profile.fillForm();
    profile.confirmPasswordInput.clear().type('outra-senha-123');
    profile.submitButton.click();
    cy.contains('tg-field', 'As senhas não são iguais.').should('be.visible');
    profile.confirmPasswordInput.should('have.focus');
    cy.location('pathname').should('eq', '/authenticate/profile');
    profile.confirmPasswordInput.clear().type(client.password);
    profile.submitButton.click();
    cy.location('pathname').should('eq', '/authenticate/register');
  });

  it('valida navegação inicial entre login e cadastro', () => {
    visitAuth();

    const register = new RegisterElements(client);
    register.toFormRegisterButton.click();
    cy.url().should('include', '/authenticate/register');
    register.loginLink.click();
    cy.url().should('include', '/authenticate/login');
    register.registerLink.click();
    cy.url().should('include', '/authenticate/register');
  });

  it('cadastra um cliente com perfil, contato e endereço', () => {
    cy.intercept('POST', `${apiUrl}/auth/register`, {
      statusCode: 201,
      body: authResponses.client,
    }).as('registerClient');

    visitAuth('/authenticate/register');

    const register = new RegisterElements(client);
    register.customerChoice.click();
    register.categoryStep.should('not.exist');
    register.registerButton.should('be.disabled');

    preencherPerfil(client);
    preencherContato({ completo: true });
    preencherEndereco({ completo: true });

    register.registerButton.should('be.enabled').click();

    cy.wait('@registerClient')
      .its('request.body')
      .should((user) => {
        expect(user.type).to.equal('CLIENTE');
        expect(user.name).to.equal(client.name);
        expect(user.email).to.equal(client.email);
        expect(user.phone).to.equal('11912345678');
        expect(user.cpf).to.equal('52998224725');
        expect(user.password).to.equal(client.password);
        expect(user.address).to.include({
          cep: '01001000',
          city: 'São Paulo',
          state: 'SP',
          street: respostaCep.street,
          number: '100',
        });
        expect(user.subcategoryIds).to.deep.equal([]);
      });

    assertRegisteredSession('client');
  });

  it('exibe erro quando o cadastro retorna falha da API', () => {
    cy.intercept('POST', `${apiUrl}/auth/register`, {
      statusCode: 400,
      body: { message: ['Email já cadastrado'] },
    }).as('registerError');

    visitAuth('/authenticate/register');

    preencherPerfil(client);
    preencherContato({ completo: true });
    preencherEndereco({ completo: true });

    const register = new RegisterElements(client);
    register.registerButton.should('be.enabled').click();

    cy.wait('@registerError');
    register.alertComponent.should('contain.text', 'Email já cadastrado');
    cy.contains('h1', 'Conta criada').should('not.exist');
    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('be.null');
    cy.intercept('POST', `${apiUrl}/auth/register`, {
      statusCode: 201,
      body: authResponses.client,
    }).as('retryRegister');
    register.registerButton.click();
    cy.wait('@retryRegister');
    assertRegisteredSession('client');
  });

  it('cadastra um prestador com perfil, contato, endereço, categoria e serviço', () => {
    cy.intercept('POST', `${apiUrl}/auth/register`, {
      statusCode: 201,
      body: authResponses.provider,
    }).as('registerProvider');

    visitAuth();

    const register = new RegisterElements(provider);
    register.toFormRegisterButton.click();
    cy.url().should('include', '/authenticate/register');
    register.providerChoice.click();
    register.providerChoice.find('input').should('be.checked');
    register.categoryStep.should('be.visible');
    register.registerButton.should('be.disabled');

    preencherPerfil(provider);
    preencherContato({ completo: true });
    preencherEndereco({ completo: true });
    fillProviderService();

    register.registerButton.should('be.enabled').click();

    cy.wait('@registerProvider')
      .its('request.body')
      .should((user) => {
        expect(user.type).to.equal('PRESTADOR');
        expect(user.name).to.equal(provider.name);
        expect(user.email).to.equal(provider.email);
        expect(user.subcategoryIds).to.deep.equal(['11']);
      });

    assertRegisteredSession('provider');
  });
});
