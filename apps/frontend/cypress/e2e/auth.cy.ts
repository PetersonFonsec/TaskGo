import LoginElements from '../support/pages/login';
import RegisterElements from '../support/pages/register';
import RegisterProfileFormElements from '../support/pages/register-profile-form';

const apiUrl = Cypress.env('url');

const client = {
  name: 'Cliente Teste',
  email: 'cliente.teste@taskgo.com',
  password: '123456',
  cpf: '123.456.789-01',
  phone: '(11) 91234-5678',
};

const provider = {
  name: 'Prestador Teste',
  email: 'prestador.teste@taskgo.com',
  password: '123456',
  cpf: '123.456.789-10',
  phone: '(11) 92345-6789',
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

const cepResponse = {
  cep: '01001-000',
  state: 'SP',
  city: 'São Paulo',
  neighborhood: 'Sé',
  street: 'Praça da Sé',
  latitude: -23.55052,
  longitude: -46.633308,
};

function visitAuth(path = '/authenticate') {
  cy.visit(path);
}

function fillProfile(user: typeof client) {
  const profile = new RegisterProfileFormElements(user);

  cy.get('#profile-step').click();
  cy.url().should('include', '/authenticate/profile');
  profile.submitButton.should('be.disabled');
  profile.fillForm();
  profile.submitButton.should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function fillContact() {
  cy.get('#contact-step').click();
  cy.url().should('include', '/authenticate/contact');
  cy.get('#whatsapp-input').type('11 11 99999-9999');
  cy.get('#instagram-input').type('@taskgo');
  cy.get('#facebook-input').type('taskgo');
  cy.get('#linkedin-input').type('taskgo');
  cy.contains('#social-form_footer button', 'Salvar').click();
  cy.url().should('include', '/authenticate/register');
}

function fillAddress() {
  cy.intercept('GET', 'https://brasilapi.com.br/api/cep/v2/01001000', cepResponse).as('getCep');

  cy.get('#address-step').click();
  cy.url().should('include', '/authenticate/address');
  cy.get('#zipcode-input').type('01001-000').blur();
  cy.wait('@getCep');
  cy.get('#street-input').should('have.value', cepResponse.street);
  cy.get('#neighborhood-input').should('have.value', cepResponse.neighborhood);
  cy.get('#number-input').type('100');
  cy.get('#complement-input').type('Sala 1');
  cy.contains('#address-form_footer button', 'Criar endereço').should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function fillProviderService() {
  cy.intercept('GET', `${apiUrl}/categories`, categoriesResponse).as('getCategories');
  cy.intercept('GET', `${apiUrl}/categories/1`, categoryDetailsResponse).as('getCategoryDetails');

  cy.get('#category-step').click();
  cy.url().should('include', '/authenticate/category');
  cy.wait('@getCategories');
  cy.contains('#category-form_content app-card', 'Limpeza').click();
  cy.contains('#category-form_footer button', 'Selecionar categoria').should('be.enabled').click();

  cy.url().should('include', '/authenticate/category/1/service');
  cy.wait('@getCategoryDetails');
  cy.contains('#service-form_content label.checkbox', 'Faxina residencial').click();
  cy.get('#service-form_content input[type=checkbox]').should('be.checked');
  cy.contains('#service-form_content label.checkbox', 'Faxina residencial').click();
  cy.get('#service-form_content input[type=checkbox]').should('not.be.checked');
  cy.contains('#service-form_footer button', 'Adicionar serviços').should('be.disabled');
  cy.contains('#service-form_content label.checkbox', 'Faxina residencial').click();
  cy.contains('#service-form_footer button', 'Adicionar serviços').should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

function assertRegisteredSession(role: 'client' | 'provider') {
  const response = authResponses[role];
  const path = role === 'client' ? '/customer' : '/provider';
  cy.contains('.full-modal', 'Perfil Criado!!').should('be.visible');
  cy.contains('.full-modal button', 'Acessar Plataforma').click();
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
  cy.intercept('GET', `${apiUrl}/auth/provider-home`, {
    earnings: { today: 0, month: 0, previousMonth: 0, lastSixMonths: [] },
    services: { completedTotal: 0, completedThisWeek: 0 },
    rating: { average: 0, count: 0 },
    pendingRequests: [],
    activeOrders: [],
    recentServices: [],
    insights: {
      mostRequestedService: null,
      averageTicket: 0,
      mostServedNeighborhood: null,
      monthlyGrowth: null,
    },
  });
});

describe('Autenticação', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('valida campos obrigatórios do login', () => {
    visitAuth('/authenticate/login');

    const login = new LoginElements(client);
    login.submitButton.should('be.disabled');

    login.emailInput.type('email-invalido');
    login.passwordInput.type(client.password);
    login.submitButton.should('be.disabled');
    login.passwordInput.clear();
    login.emailInput.clear().type(client.email);
    login.submitButton.should('be.disabled');

    login.passwordInput.type(client.password);
    login.submitButton.should('be.enabled');
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
    profile.confirmPasswordInput.clear().type('outra-senha');
    profile.submitButton.should('be.disabled');
    cy.contains('[role=alert]', 'As senhas devem ser iguais.').should('be.visible');
    profile.confirmPasswordInput.clear().type(client.password);
    profile.submitButton.should('be.enabled').click();
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
    register.customerBadge.click();
    register.categoryStep.should('not.exist');
    register.registerButton.should('be.disabled');

    fillProfile(client);
    fillContact();
    fillAddress();

    register.registerButton.should('be.enabled').click();

    cy.wait('@registerClient')
      .its('request.body')
      .should((user) => {
        expect(user.type).to.equal('CLIENTE');
        expect(user.name).to.equal(client.name);
        expect(user.email).to.equal(client.email);
        expect(user.phone).to.equal('11912345678');
        expect(user.cpf).to.equal('12345678901');
        expect(user.password).to.equal(client.password);
        expect(user.address).to.include({
          cep: '01001000',
          city: 'São Paulo',
          state: 'SP',
          street: cepResponse.street,
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

    fillProfile(client);
    fillContact();
    fillAddress();

    const register = new RegisterElements(client);
    register.registerButton.should('be.enabled').click();

    cy.wait('@registerError');
    register.alertComponent.should('contain.text', 'Email já cadastrado');
    cy.get('.full-modal').should('not.exist');
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
    register.providerBadge.should('have.class', 'selected');
    register.categoryStep.should('be.visible');
    register.registerButton.should('be.disabled');

    fillProfile(provider);
    fillContact();
    fillAddress();
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
