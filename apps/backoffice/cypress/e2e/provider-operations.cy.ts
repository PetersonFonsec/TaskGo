type AdminRole = 'ADMINISTRATOR' | 'SUPPORT';
type ProviderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

const adminToken = (role: AdminRole) =>
  [
    btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
    btoa(JSON.stringify({ sub: '42', tokenKind: 'admin', role, ver: 1 })).replace(/=+$/, ''),
    'signature'
  ].join('.');

describe('Provider operations', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('lets an Administrator approve a pending provider and see lifecycle history', () => {
    const state = { status: 'PENDING' as ProviderStatus, history: [] as unknown[] };

    interceptProvider(state);
    cy.intercept('POST', 'http://localhost:3000/admin/providers/42/approve', (request) => {
      state.status = 'APPROVED';
      state.history = [
        {
          id: '900',
          action: 'APPROVE',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          reason: null,
          createdAt: '2026-07-04T13:00:00.000Z',
          actor: {
            id: '42',
            name: 'Admin Operator',
            email: 'admin@example.com',
            role: 'ADMINISTRATOR',
            active: true
          }
        }
      ];
      request.reply({ statusCode: 200, body: lifecycle('APPROVED') });
    }).as('approve');

    visitAs('/providers/42', 'ADMINISTRATOR');
    cy.findByRole('heading', { name: 'Provider Example' }).should('be.visible');
    cy.findByLabelText('Current status: Pending review').should('be.visible');
    cy.findByRole('button', { name: 'Approve' }).click();
    cy.findByRole('dialog', { name: 'Confirm Approve' }).should('be.visible');
    cy.findByRole('button', { name: 'Confirm Approve' }).click();
    cy.wait('@approve');

    cy.findByRole('status').should('contain.text', 'Approve completed');
    cy.findByLabelText('Current status: Approved').should('be.visible');
    cy.findByRole('heading', { name: 'Lifecycle history' }).should('be.visible');
    cy.contains('APPROVE').should('be.visible');
  });

  it('keeps Support read-only on the same provider record', () => {
    interceptProvider({ status: 'PENDING', history: [] });

    visitAs('/providers/42', 'SUPPORT');

    cy.findByRole('heading', { name: 'Provider Example' }).should('be.visible');
    cy.findByText('No provider decisions are available for your role and this status.').should(
      'be.visible'
    );
    cy.findByRole('button', { name: 'Approve' }).should('not.exist');
    cy.findByRole('button', { name: 'Reject' }).should('not.exist');
  });

  it('refreshes stale state and presents a clear 409 conflict message', () => {
    const state = { status: 'PENDING' as ProviderStatus, history: [] as unknown[] };
    interceptProvider(state);
    cy.intercept('POST', 'http://localhost:3000/admin/providers/42/approve', (request) => {
      state.status = 'APPROVED';
      request.reply({ statusCode: 409, body: { message: 'Provider state transition conflict' } });
    }).as('approveConflict');

    visitAs('/providers/42', 'ADMINISTRATOR');
    cy.findByRole('button', { name: 'Approve' }).click();
    cy.findByRole('button', { name: 'Confirm Approve' }).click();
    cy.wait('@approveConflict');

    cy.findByRole('alert').should('contain.text', 'Provider status changed');
    cy.findByLabelText('Current status: Approved').should('be.visible');
  });

  it('supports keyboard and screen-reader assertions for decision dialogs', () => {
    interceptProvider({ status: 'PENDING', history: [] });

    visitAs('/providers/42', 'ADMINISTRATOR');
    cy.findByLabelText('Current status: Pending review').should('be.visible');
    cy.findByRole('button', { name: 'Reject' }).focus().type('{enter}');

    cy.findByRole('dialog', { name: 'Confirm Reject' })
      .should('be.visible')
      .and('have.attr', 'aria-modal', 'true')
      .and('have.attr', 'aria-describedby', 'decision-dialog-description');
    cy.findByRole('heading', { name: 'Confirm Reject' }).should('have.focus');
    cy.findByRole('button', { name: 'Confirm Reject' }).click();
    cy.findByRole('alert').should('contain.text', 'Reject requires an operational reason');
    cy.findByLabelText('Operational reason').type('Missing required document');
    cy.findByRole('alert').should('not.exist');
  });
});

function visitAs(path: string, role: AdminRole): void {
  const operator = {
    id: '42',
    name: role === 'ADMINISTRATOR' ? 'Admin Operator' : 'Support Operator',
    email: role === 'ADMINISTRATOR' ? 'admin@example.com' : 'support@example.com',
    role,
    active: true,
    activatedAt: '2026-07-04T12:00:00.000Z'
  };

  cy.visit(path, {
    onBeforeLoad: (window) => {
      window.localStorage.setItem('proxi.backoffice.dev.adminToken', adminToken(role));
      window.localStorage.setItem(
        'proxi.backoffice.dev.adminToken.identity',
        JSON.stringify(operator)
      );
    }
  });
}

function interceptProvider(state: { status: ProviderStatus; history: unknown[] }): void {
  cy.intercept('GET', 'http://localhost:3000/admin/providers/42', () => ({
    statusCode: 200,
    body: { provider: provider(state.status) }
  })).as('providerDetails');
  cy.intercept('GET', 'http://localhost:3000/admin/providers/42/history?page=1&limit=100', () => ({
    statusCode: 200,
    body: {
      data: state.history,
      meta: { total: state.history.length, page: 1, limit: 100, totalPages: 1 }
    }
  })).as('providerHistory');
}

function provider(status: ProviderStatus) {
  return {
    id: '42',
    submittedAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-02T12:00:00.000Z',
    identity: {
      id: '101',
      name: 'Provider Example',
      email: 'provider@example.com',
      phone: '+5511999999999',
      cpf: '12345678900',
      photoUrl: null,
      userCreatedAt: '2026-07-01T12:00:00.000Z'
    },
    verification: {
      providerVerified: status === 'APPROVED',
      emailVerified: true,
      phoneVerified: true
    },
    status: { current: status, changedAt: '2026-07-02T12:00:00.000Z' },
    serviceSummary: { count: 1 },
    reviewSummary: { averageRating: 4.8, ratingCount: 4, reviewCount: 4 },
    decisionSummary: { count: 0 },
    capabilities: {
      acceptsPix: true,
      acceptsCard: true,
      emergencyCare: false,
      available24h: false
    },
    bio: 'Provider under review',
    paymentContext: { pagarmeRecipientId: 'rp_123' },
    services: [
      {
        id: '700',
        title: 'Residential cleaning',
        description: 'Home cleaning service',
        category: 'Cleaning',
        basePrice: 120,
        status: 'ACTIVE',
        createdAt: '2026-07-01T12:00:00.000Z',
        updatedAt: '2026-07-01T12:00:00.000Z'
      }
    ],
    serviceAreas: [],
    locations: [],
    operationalHistory: { ordersByStatus: [], recentOrders: [] },
    decisionContext: {
      latestDecision: null,
      recentDecisions: [],
      firstDecisionAt: null
    }
  };
}

function lifecycle(status: ProviderStatus) {
  return {
    provider: {
      id: '42',
      verification: { providerVerified: status === 'APPROVED' },
      status: { current: status, changedAt: '2026-07-04T13:00:00.000Z' }
    }
  };
}

export {};
