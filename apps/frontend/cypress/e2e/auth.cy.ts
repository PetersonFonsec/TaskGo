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
  cy.visit(`http://localhost:4200${path}`);
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
  cy.get('#whatsapp').type('11 11 99999-9999');
  cy.get('#instagram').type('@taskgo');
  cy.get('#facebook').type('taskgo');
  cy.get('#linkedin').type('taskgo');
  cy.contains('#social-form_footer button', 'Salvar').click();
  cy.url().should('include', '/authenticate/register');
}

function fillAddress() {
  cy.intercept('GET', 'https://brasilapi.com.br/api/cep/v2/01001000', cepResponse).as('getCep');

  cy.get('#address-step').click();
  cy.url().should('include', '/authenticate/address');
  cy.get('#zipcode').type('01001-000').blur();
  cy.wait('@getCep');
  cy.get('#street').should('have.value', cepResponse.street);
  cy.get('#neighborhood').should('have.value', cepResponse.neighborhood);
  cy.get('#number').type('100');
  cy.get('#complement').type('Sala 1');
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
  cy.contains('#service-form_content app-input-checkbox', 'Faxina residencial').click();
  cy.contains('#service-form_footer button', 'Adicionar serviços').should('be.enabled').click();
  cy.url().should('include', '/authenticate/register');
}

describe('Autenticação', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('valida campos obrigatórios do login', () => {
    visitAuth('/authenticate/login');

    const login = new LoginElements(client);
    login.submitButton.should('be.disabled');

    login.emailInput.type(client.email);
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
      .its('request.body.user')
      .should((user) => {
        expect(user.type).to.equal('CLIENTE');
        expect(user.name).to.equal(client.name);
        expect(user.email).to.equal(client.email);
        expect(user.phone).to.equal('11912345678');
        expect(user.cpf).to.equal('12345678901');
        expect(user.address.cep).to.equal('01001000');
      });

    cy.contains('.full-modal', 'Perfil Criado!!').should('be.visible');
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
      .its('request.body.user')
      .should((user) => {
        expect(user.type).to.equal('PRESTADOR');
        expect(user.name).to.equal(provider.name);
        expect(user.email).to.equal(provider.email);
        expect(user.services).to.have.length(1);
        expect(user.services[0].id).to.equal(11);
      });

    cy.contains('.full-modal', 'Perfil Criado!!').should('be.visible');
  });
});
