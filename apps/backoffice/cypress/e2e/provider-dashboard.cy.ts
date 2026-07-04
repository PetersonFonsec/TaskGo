type AdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

const adminToken = (role: AdminRole) =>
  [
    btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
    btoa(JSON.stringify({ sub: '42', tokenKind: 'admin', role, ver: 1 })).replace(/=+$/, ''),
    'signature',
  ].join('.');

describe('Provider dashboard', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('renders seeded provider metrics for Administrator and Support', () => {
    interceptDashboard();
    visitAs('/', 'ADMINISTRATOR');

    cy.wait('@dashboard')
      .its('request.url')
      .should('equal', 'http://localhost:3000/admin/dashboard/providers');
    cy.findByRole('heading', { name: 'Provider dashboard' }).should('be.visible');
    cy.findByText('Pending providers').should('be.visible');
    cy.findByText('12').should('be.visible');
    cy.findByText('6.5 hr average across 4 reviewed providers.').should('be.visible');
    cy.findByText('Provider Example').should('be.visible');
    cy.findByRole('link', { name: /Pending providers/ })
      .should('have.attr', 'href')
      .and('include', 'status=PENDING');

    interceptDashboard();
    visitAs('/', 'SUPPORT');
    cy.wait('@dashboard');
    cy.findByRole('heading', { name: 'Provider dashboard' }).should('be.visible');
  });

  it('denies Finance and Moderator during the MVP', () => {
    visitAs('/', 'FINANCE');
    cy.findByText('Dashboard unavailable for FINANCE').should('be.visible');
    cy.findByText('Provider dashboard access is limited to Administrator and Support roles').should(
      'be.visible',
    );

    visitAs('/', 'MODERATOR');
    cy.findByText('Dashboard unavailable for MODERATOR').should('be.visible');
  });

  it('keeps loading and error states keyboard and screen-reader accessible', () => {
    cy.intercept('GET', 'http://localhost:3000/admin/dashboard/providers', {
      delay: 200,
      body: dashboard(),
    }).as('dashboard');
    visitAs('/', 'ADMINISTRATOR');
    cy.findByRole('status').should('contain.text', 'Loading provider dashboard metrics');
    cy.wait('@dashboard');

    cy.intercept('GET', 'http://localhost:3000/admin/dashboard/providers', {
      statusCode: 500,
      body: { message: 'Dashboard unavailable' },
    }).as('dashboardError');
    visitAs('/', 'ADMINISTRATOR');
    cy.wait('@dashboardError');
    cy.findByRole('alert').should(
      'contain.text',
      'Provider dashboard metrics could not be loaded.',
    );
    cy.findByRole('button', { name: 'Retry' }).focus().should('have.focus');
  });

  it('requests and renders a selected reporting period', () => {
    interceptDashboard();
    visitAs('/', 'ADMINISTRATOR');
    cy.wait('@dashboard');

    cy.intercept('GET', /\/admin\/dashboard\/providers\?from=.*&to=.*/, (request) => {
      expect(request.query).to.have.keys(['from', 'to']);
      request.reply({
        statusCode: 200,
        body: dashboard({ approve: 7, total: 10 }),
      });
    }).as('dashboardPeriod');

    cy.findByLabelText('Reporting period').select('Last 7 days');
    cy.wait('@dashboardPeriod');
    cy.findByText('7').should('be.visible');
  });
});

function visitAs(path: string, role: AdminRole): void {
  const operator = {
    id: '42',
    name: role === 'SUPPORT' ? 'Support Operator' : `${role} Operator`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    active: true,
    activatedAt: '2026-07-04T12:00:00.000Z',
  };

  cy.visit(path, {
    onBeforeLoad: (window) => {
      window.localStorage.setItem('proxi.backoffice.dev.adminToken', adminToken(role));
      window.localStorage.setItem(
        'proxi.backoffice.dev.adminToken.identity',
        JSON.stringify(operator),
      );
    },
  });
}

function interceptDashboard(): void {
  cy.intercept('GET', 'http://localhost:3000/admin/dashboard/providers', {
    statusCode: 200,
    body: dashboard(),
  }).as('dashboard');
}

function dashboard(overrides: Partial<{ approve: number; total: number }> = {}) {
  const approve = overrides.approve ?? 5;
  const total = overrides.total ?? 9;

  return {
    period: {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      defaultDays: 30,
      maxDays: 90,
    },
    queue: { pending: 12 },
    decisions: { approve, reject: 2, block: 1, unblock: 1, total },
    reviewDuration: { averageMs: 23_400_000, averageHours: 6.5, reviewedProviders: 4 },
    recentSensitiveActions: [
      {
        id: '900',
        action: 'BLOCK',
        fromStatus: 'APPROVED',
        toStatus: 'BLOCKED',
        reason: 'Policy risk',
        createdAt: '2026-07-04T13:00:00.000Z',
        provider: {
          id: '42',
          status: 'BLOCKED',
          name: 'Provider Example',
          email: 'provider@example.com',
        },
        actor: {
          id: '42',
          role: 'ADMINISTRATOR',
          name: 'Admin Operator',
          email: 'admin@example.com',
          active: true,
        },
      },
    ],
  };
}

export {};
