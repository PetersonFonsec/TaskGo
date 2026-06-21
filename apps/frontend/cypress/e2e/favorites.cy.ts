/// <reference types="cypress" />

describe('Favorites MVP', () => {
  const customer = {
    email: 'customer@example.com',
    password: 'password123',
  };

  const userResponse = {
    user: {
      id: '10',
      name: 'Cliente Teste',
      email: customer.email,
      type: 'CLIENTE',
      phone: '11999999999',
      photoUrl: '',
      passwordHash: '',
      createdAt: {},
      updatedAt: {},
      cpf: '12345678901',
      addresses: [],
      orders: [],
      reviews: [],
      provider: null,
    },
    access_token: 'fake-token',
  };

  const favoritedProvider = {
    id: '1',
    user: { name: 'Provider Favorito', phone: '999999999' },
    lat: -23.55052,
    lng: -46.633308,
    services: [{ basePrice: 120 }],
  };

  const nonFavoritedProvider = {
    id: '2',
    user: { name: 'Outro Provider', phone: '888888888' },
    lat: -23.551,
    lng: -46.634,
    services: [{ basePrice: 150 }],
  };

  beforeEach(() => {
    let currentFavorites = [] as Array<{ id: string; user: { name: string; phone: string }; services: any[] }>;

    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: userResponse,
    }).as('loginRequest');

    cy.intercept('GET', '**/provider/by-category/*', (req) => {
      const onlyFavorites = req.query.onlyFavorites === 'true';
      req.reply({
        statusCode: 200,
        body: onlyFavorites ? currentFavorites : [favoritedProvider, nonFavoritedProvider],
      });
    }).as('searchProviders');

    cy.intercept('GET', `${Cypress.env('url')}/favorites`, (req) => {
      req.reply({
        statusCode: 200,
        body: {
          items: currentFavorites.map((provider) => ({
            providerId: provider.id,
            provider,
          })),
        },
      });
    }).as('favoritesList');

    cy.intercept('POST', `${Cypress.env('url')}/favorites`, (req) => {
      const requestedId = String(req.body?.providerId ?? '');
      const addedProvider = requestedId === '1' ? favoritedProvider : nonFavoritedProvider;
      currentFavorites.push(addedProvider);
      req.reply({
        statusCode: 201,
        body: { clientId: '10', providerId: requestedId },
      });
    }).as('addFavorite');

    cy.intercept('DELETE', `${Cypress.env('url')}/favorites/1`, (req) => {
      currentFavorites = currentFavorites.filter((provider) => provider.id !== '1');
      req.reply({ statusCode: 200, body: {} });
    }).as('removeFavorite');

    cy.intercept('GET', '**/order/client/10', {
      statusCode: 200,
      body: [],
    }).as('orderList');
  });

  it('adds a favorite in search, filters only favorites, and removes it from Favorites page', () => {
    cy.visit('http://localhost:4200/authenticate/login');

    cy.get('#email input').type(customer.email);
    cy.get('#senha input').type(customer.password);
    cy.get('#login-form_footer button').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/customer');

    cy.window().its('localStorage').invoke('getItem', '@ODIN/TOKEN').should('equal', userResponse.access_token);
    cy.window().its('localStorage').invoke('getItem', '@ODIN/USER').should('equal', JSON.stringify(userResponse));
    cy.window().then((win) => {
      const storedUser = JSON.parse(win.localStorage.getItem('@ODIN/USER') ?? '{}');
      expect(storedUser.user.type).to.equal('CLIENTE');
    });

    cy.get('#customer-home_categories_list').contains('Tecnologia e Consultoria').click();
    cy.url().should('include', '/customer/search');
    cy.wait('@searchProviders');
    cy.wait('@favoritesList');

    cy.get('#customer-search').within(() => {
      cy.contains('Provider Favorito').should('exist');
      cy.contains('Outro Provider').should('exist');
      cy.get('button.favorite').should('have.length.at.least', 2);
    });

    cy.get('#customer-search button.favorite').first().click();
    cy.wait('@addFavorite');

    cy.get('#customer-search_filters_actions input[type="checkbox"]').check({ force: true });
    cy.wait('@searchProviders');

    cy.window().its('localStorage').invoke('getItem', 'search.onlyFavorites.10').should('equal', 'true');

    cy.get('#customer-search').within(() => {
      cy.contains('Provider Favorito').should('exist');
      cy.contains('Outro Provider').should('not.exist');
    });

    cy.window().then((win) => {
      win.history.pushState({}, '', '/customer/favorites');
      win.dispatchEvent(new PopStateEvent('popstate'));
    });

    cy.url().should('include', '/customer/favorites');
    cy.wait('@favoritesList');

    cy.get('#customer-favorites').within(() => {
      cy.contains('Meus favoritos').should('exist');
      cy.contains('Provider Favorito').should('exist');
      cy.get('button.card-detail_favorite').contains('Remover dos favoritos').click();
    });

    cy.wait('@removeFavorite');
    cy.contains('Você não possui nenhum profissional favoritado.').should('exist');
  });
});
