type AdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

const adminToken = (role: AdminRole) =>
  [
    btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
    btoa(JSON.stringify({ sub: '42', tokenKind: 'admin', role, ver: 1 })).replace(/=+$/, ''),
    'signature',
  ].join('.');

describe('Audit log investigation', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('lets an Administrator locate and inspect a seeded event by operator, action, target, and date', () => {
    interceptAudit();
    visitAs('/audit-logs', 'ADMINISTRATOR');
    cy.wait('@auditList');

    cy.findByLabelText('Operator ID').clear().type('42');
    cy.findByLabelText('Action').clear().type('PROVIDER_BLOCKED');
    cy.findByLabelText('Entity').clear().type('Provider');
    cy.findByLabelText('Identifier').clear().type('700');
    cy.findByLabelText('From').type('2026-07-01');
    cy.findByLabelText('To').type('2026-07-04');
    cy.findByRole('button', { name: 'Apply filters' }).click();

    cy.wait('@auditFiltered').then(({ request }) => {
      expect(request.query).to.include({
        operatorId: '42',
        action: 'PROVIDER_BLOCKED',
        entityType: 'Provider',
        entityId: '700',
      });
      expect(request.query.from).to.equal('2026-07-01T00:00:00.000Z');
      expect(request.query.to).to.equal('2026-07-04T23:59:59.999Z');
    });

    cy.findByText('PROVIDER_BLOCKED').should('be.visible');
    cy.findByText('Provider #700').should('be.visible');
    cy.findByRole('link', { name: 'Open details' }).click();
    cy.wait('@auditDetail');

    cy.findByRole('heading', { name: 'PROVIDER_BLOCKED' }).should('be.visible');
    cy.findByText('Admin Operator').should('be.visible');
    cy.findByText('Provider #700').should('be.visible');
    cy.findByText('Policy risk').should('be.visible');
    cy.findByText('req-123').should('be.visible');
    cy.findByText('status').should('be.visible');
    cy.findByText('BLOCKED').should('be.visible');
    cy.findByText('secret-value').should('not.exist');
    cy.get('img').should('not.exist');

    cy.findByRole('link', { name: 'Back to audit log' }).click();
    cy.location('search').should('include', 'operatorId=42');
    cy.location('search').should('include', 'action=PROVIDER_BLOCKED');
  });

  it('blocks Support, Finance, and Moderator from the audit route', () => {
    cy.intercept('GET', 'http://localhost:3000/admin/dashboard/providers', {
      statusCode: 200,
      body: dashboard(),
    }).as('dashboard');

    (['SUPPORT', 'FINANCE', 'MODERATOR'] as const).forEach((role) => {
      visitAs('/audit-logs', role);
      cy.location('pathname').should('equal', '/');
      cy.findByText('Audit investigation').should('not.exist');
    });
  });

  it('does not expose edit or delete controls in list or detail views', () => {
    interceptAudit();
    visitAs('/audit-logs', 'ADMINISTRATOR');
    cy.wait('@auditList');

    cy.findByRole('button', { name: /edit/i }).should('not.exist');
    cy.findByRole('button', { name: /delete/i }).should('not.exist');
    cy.findByRole('link', { name: 'Open details' }).click();
    cy.wait('@auditDetail');

    cy.findByRole('button', { name: /edit/i }).should('not.exist');
    cy.findByRole('button', { name: /delete/i }).should('not.exist');
  });
});

function visitAs(path: string, role: AdminRole): void {
  const operator = {
    id: '42',
    name: `${role} Operator`,
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

function interceptAudit(): void {
  cy.intercept('GET', 'http://localhost:3000/admin/audit-logs', {
    statusCode: 200,
    body: page(),
  }).as('auditList');

  cy.intercept('GET', /\/admin\/audit-logs\?.*operatorId=42.*/, {
    statusCode: 200,
    body: page(),
  }).as('auditFiltered');

  cy.intercept('GET', 'http://localhost:3000/admin/audit-logs/900*', {
    statusCode: 200,
    body: { auditLog: eventDetail() },
  }).as('auditDetail');
}

function page() {
  return {
    data: [eventSummary()],
    meta: { total: 1, page: 1, limit: 25, totalPages: 1, hasPrevPage: false, hasNextPage: false },
  };
}

function eventSummary() {
  return {
    id: '900',
    action: 'PROVIDER_BLOCKED',
    target: { type: 'Provider', id: '700' },
    actor: {
      id: '42',
      role: 'ADMINISTRATOR',
      name: 'Admin Operator',
      email: 'admin@example.com',
      active: true,
    },
    reason: 'Policy risk',
    requestId: 'req-123',
    createdAt: '2026-07-04T13:00:00.000Z',
  };
}

function eventDetail() {
  return {
    ...eventSummary(),
    before: {
      status: 'APPROVED',
      invitationToken: 'secret-value',
      message: '<img src=x onerror=alert(1)>',
    },
    after: {
      status: 'BLOCKED',
      reasonCode: 'POLICY',
    },
    context: { ipAddress: '127.0.0.1', userAgent: 'Cypress' },
  };
}

function dashboard() {
  return {
    period: {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      defaultDays: 30,
      maxDays: 90,
    },
    queue: { pending: 0 },
    decisions: { approve: 0, reject: 0, block: 0, unblock: 0, total: 0 },
    reviewDuration: { averageMs: null, averageHours: null, reviewedProviders: 0 },
    recentSensitiveActions: [],
  };
}

export {};
