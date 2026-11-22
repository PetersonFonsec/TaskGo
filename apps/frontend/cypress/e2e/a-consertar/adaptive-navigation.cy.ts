/// <reference types="cypress" />

export {};

const apiUrl = Cypress.env('url');
const unavailableLabels = [
  'Cartões',
  'Pagamentos',
  'Segurança',
  'Notificações',
  'Preferências',
  'Ajuda e Suporte',
  'Dados Profissionais',
  'Conta Bancária',
  'Ganhos',
  'Plano Premium',
];

function session(role: 'CLIENTE' | 'PRESTADOR') {
  return {
    access_token: `${role.toLowerCase()}-token`,
    user: {
      id: '42',
      name: role === 'CLIENTE' ? 'Cliente Teste' : 'Prestador Teste',
      email: `${role.toLowerCase()}@taskgo.test`,
      phone: '5511999999999',
      type: role,
      addresses: [],
    },
  };
}

function visitAuthenticated(path: string, role: 'CLIENTE' | 'PRESTADOR' = 'CLIENTE') {
  const authenticatedSession = session(role);
  const provider = {
    id: '77',
    ratingAvg: 5,
    user: {
      id: '77',
      name: 'Prestador de Teste',
      email: 'prestador.77@taskgo.test',
      phone: '5511988888888',
    },
    services: [{ id: 'service-1', title: 'Serviço de teste', basePrice: 100 }],
    reviews: [],
    locations: [],
  };

  cy.intercept('GET', `${apiUrl}/user/42`, {
    statusCode: 200,
    body: authenticatedSession.user,
  }).as('getUser');
  cy.intercept('GET', `${apiUrl}/user/me/addresses*`, {
    statusCode: 200,
    body: { data: [] },
  }).as('getAddresses');
  cy.intercept('GET', `${apiUrl}/order/client/42`, {
    statusCode: 200,
    body: [],
  }).as('getCustomerOrders');
  cy.intercept('GET', `${apiUrl}/order/provider/42`, {
    statusCode: 200,
    body: [],
  }).as('getProviderOrders');
  cy.intercept('GET', `${apiUrl}/categories*`, {
    statusCode: 200,
    body: { data: [], meta: { total: 0, page: 1, limit: 10 } },
  }).as('getCategories');
  cy.intercept('GET', `${apiUrl}/provider/by-category/**`, {
    statusCode: 200,
    body: [],
  }).as('getProviders');
  cy.intercept('GET', `${apiUrl}/favorites`, {
    statusCode: 200,
    body: { items: [] },
  }).as('getFavorites');
  cy.intercept('GET', `${apiUrl}/provider/77`, {
    statusCode: 200,
    body: provider,
  }).as('getProvider');
  cy.intercept('GET', `${apiUrl}/provider/77/availability*`, {
    statusCode: 200,
    body: {
      providerId: '77',
      timezone: 'America/Sao_Paulo',
      days: [],
    },
  }).as('getAvailability');
  cy.intercept('GET', `${apiUrl}/order/900/summary`, {
    statusCode: 200,
    body: {
      client: { name: 'Cliente Teste', phone: '5511999999999', email: 'cliente@taskgo.test' },
      service: { title: 'Serviço de teste', category: 'Teste' },
    },
  }).as('getOrderSummary');

  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('@ODIN/TOKEN', authenticatedSession.access_token);
      win.localStorage.setItem('@ODIN/USER', JSON.stringify(authenticatedSession));
    },
  });
}

function assertOnlyAvailableNavigation(navigationSelector = '[data-testid="account-navigation"]') {
  cy.get(navigationSelector).within(() => {
    cy.contains('Dados Pessoais').should('be.visible');
    cy.contains('Endereços').should('be.visible');
    cy.contains('Sair da Conta').should('be.visible');

    unavailableLabels.forEach((label) => {
      cy.contains(label).should('not.exist');
    });

    cy.get('a')
      .should('have.length', 2)
      .each(($link) => {
        expect($link.attr('href')).to.match(/^\/general\/42\/(profile|addresses)$/);
        expect($link.attr('href')).not.to.contain('/general/1/');
      });
  });
}

describe('Adaptive navigation configuration', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  (['CLIENTE', 'PRESTADOR'] as const).forEach((role) => {
    it(`renders only registered destinations for ${role}`, () => {
      visitAuthenticated('/general/42/profile/view', role);
      assertOnlyAvailableNavigation();
    });
  });

  it('uses prefix matching for Personal Data child routes', () => {
    visitAuthenticated('/general/42/profile/view');

    cy.get('[data-testid="navigation-item-personal-data"]')
      .should('have.attr', 'aria-current', 'page')
      .and('have.class', 'navigation-item--active');
    cy.get('[data-testid="navigation-item-addresses"]').should('not.have.attr', 'aria-current');

    cy.visit('/general/42/profile/edit');
    cy.get('[data-testid="navigation-item-personal-data"]')
      .should('have.attr', 'aria-current', 'page')
      .and('have.class', 'navigation-item--active');
  });

  it('uses exact matching for Addresses and resolves the authenticated user ID', () => {
    visitAuthenticated('/general/42/profile/view');
    cy.get('[data-testid="navigation-item-addresses"]').click();

    cy.location('pathname').should('equal', '/general/42/addresses');
    cy.get('[data-testid="navigation-item-addresses"]')
      .should('have.attr', 'aria-current', 'page')
      .and('have.class', 'navigation-item--active');
    cy.get('[data-testid="navigation-item-personal-data"]').should('not.have.attr', 'aria-current');
  });

  it('keeps Logout as an account action instead of a route', () => {
    visitAuthenticated('/general/42/profile/view');
    cy.get('[data-testid="navigation-item-logout"]')
      .should('have.prop', 'tagName', 'BUTTON')
      .click();

    cy.location('pathname').should('match', /^\/authenticate(?:\/|$)/);
    cy.window().then((win) => {
      expect(win.localStorage.getItem('@ODIN/TOKEN')).to.equal(null);
      expect(win.localStorage.getItem('@ODIN/USER')).to.equal(null);
    });
  });
});

describe('Header account navigation', () => {
  [320, 375, 768, 1280].forEach((width) => {
    it(`keeps all navigation in the header at ${width}px without a sidebar`, () => {
      cy.viewport(width, 800);
      visitAuthenticated('/general/42/profile/view');
      assertOnlyAvailableNavigation('app-header [data-testid="account-navigation"]');
      cy.get('app-aside').should('not.exist');
      cy.get('[data-testid="desktop-navigation-rail"]').should('not.exist');
      cy.get('[data-testid="mobile-navigation-drawer"]').should('not.exist');
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(width);
      });
      cy.get('[data-testid="navigation-item-addresses"]').click();
      cy.location('pathname').should('equal', '/general/42/addresses');
      cy.reload();
      cy.get('app-header').should('have.length', 1);
      assertOnlyAvailableNavigation('app-header [data-testid="account-navigation"]');
    });
  });
});

describe('Customer and provider shell migration', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  (
    [
      ['/customer', '.customer-home'],
      ['/customer/search', '#customer-search'],
      ['/customer/favorites', '#customer-favorites'],
      ['/customer/profile/77', '#provider-name'],
      ['/customer/77', '#single-user'],
    ] as const
  ).forEach(([path, contentSelector]) => {
    it(`keeps direct customer entry ${path} beneath one shell`, () => {
      cy.viewport(1280, 800);
      visitAuthenticated(path, 'CLIENTE');

      cy.location('pathname').should('equal', path);
      cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
      cy.get(contentSelector).should('exist');
      cy.get('[data-testid="authenticated-shell"] app-header').should('have.length', 1);
      cy.get('[data-testid="authenticated-shell"] app-footer').should('have.length', 1);
    });
  });

  (
    [
      ['/provider', 'app-provider-home'],
      ['/provider/900/aprovacao', '#provider-pending-approval'],
    ] as const
  ).forEach(([path, contentSelector]) => {
    it(`keeps direct provider entry ${path} beneath one shell`, () => {
      cy.viewport(1280, 800);
      visitAuthenticated(path, 'PRESTADOR');

      cy.location('pathname').should('equal', path);
      cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
      cy.get(contentSelector).should('exist');
      cy.get('[data-testid="authenticated-shell"] app-header').should('have.length', 1);
      cy.get('[data-testid="authenticated-shell"] app-footer').should('have.length', 1);
    });
  });

  it('redirects a customer away from the provider branch', () => {
    visitAuthenticated('/provider', 'CLIENTE');

    cy.location('pathname').should('equal', '/customer');
    cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
  });

  it('redirects a provider away from the customer branch', () => {
    visitAuthenticated('/customer', 'PRESTADOR');

    cy.location('pathname').should('equal', '/provider');
    cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
  });

  (['/customer', '/provider'] as const).forEach((path) => {
    it(`redirects no-token entry from ${path} without authenticated chrome`, () => {
      cy.visit(path);

      cy.location('pathname').should('equal', '/authenticate/login');
      cy.get('[data-testid="authenticated-shell"]').should('not.exist');
      cy.get('[data-testid="account-navigation"]').should('not.exist');
    });
  });

  (['CLIENTE', 'PRESTADOR'] as const).forEach((role) => {
    const path = role === 'CLIENTE' ? '/customer' : '/provider';

    it(`renders desktop shell and valid navigation for ${role}`, () => {
      cy.viewport(1280, 800);
      visitAuthenticated(path, role);

      cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
      cy.get('[data-testid="desktop-navigation-rail"]').should('not.exist');
      cy.get('[data-testid="header-menu-button"]').should('not.exist');
      assertOnlyAvailableNavigation('app-header [data-testid="account-navigation"]');
    });

    it(`renders header navigation on mobile for ${role}`, () => {
      cy.viewport(375, 667);
      visitAuthenticated(path, role);

      cy.get('[data-testid="desktop-navigation-rail"]').should('not.exist');
      cy.get('[data-testid="mobile-navigation-drawer"]').should('not.exist');
      assertOnlyAvailableNavigation('app-header [data-testid="account-navigation"]');
    });
  });

  it('keeps specific customer routes ahead of the generic user route', () => {
    visitAuthenticated('/customer/search', 'CLIENTE');
    cy.get('#customer-search').should('exist');
    cy.get('#single-user').should('not.exist');

    visitAuthenticated('/customer/favorites', 'CLIENTE');
    cy.get('#customer-favorites').should('exist');
    cy.get('#single-user').should('not.exist');
  });
});
