type AdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

export {};

interface OperatorFixture {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly active: boolean;
  readonly activatedAt: string | null;
}

const adminToken = [
  btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
  btoa(JSON.stringify({ sub: '42', tokenKind: 'admin', role: 'ADMINISTRATOR', ver: 1 })).replace(
    /=+$/,
    ''
  ),
  'signature'
].join('.');

describe('Operator administration', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('lets an Administrator invite and activate a Support operator', () => {
    const state = {
      operators: [operator({ id: '1', name: 'Alice Admin', role: 'ADMINISTRATOR', active: true })]
    };
    interceptOperators(state);
    cy.intercept('POST', 'http://localhost:3000/admin/users/invitations', (request) => {
      expect(request.body).to.deep.equal({
        name: 'Sam Support',
        email: 'sam@example.com',
        role: 'SUPPORT'
      });
      const invited = operator({
        id: '2',
        name: 'Sam Support',
        email: 'sam@example.com',
        role: 'SUPPORT',
        active: false,
        activatedAt: null
      });
      state.operators.push(invited);
      request.reply({
        statusCode: 201,
        body: {
          operator: invited,
          invitation: { expiresAt: '2026-07-06T12:00:00.000Z', deliveryStatus: 'SENT' }
        }
      });
    }).as('inviteSupport');
    cy.intercept('POST', 'http://localhost:3000/admin/users/2/activate', (request) => {
      state.operators = state.operators.map((item) =>
        item.id === '2'
          ? { ...item, active: true, activatedAt: '2026-07-04T15:00:00.000Z' }
          : item
      );
      request.reply({ statusCode: 200, body: { operator: state.operators[1] } });
    }).as('activateSupport');

    visitOperators();
    cy.findByRole('heading', { name: 'Operators' }).should('be.visible');
    cy.findByLabelText('Name').type('Sam Support');
    cy.findByLabelText('Email').type('sam@example.com');
    cy.findByRole('radio', { name: /Support/ }).check();
    cy.findByRole('button', { name: 'Send invitation' }).click();
    cy.wait('@inviteSupport');
    cy.findByRole('status').should('contain.text', 'Invitation sent to sam@example.com');
    cy.contains('Sam Support').should('be.visible');
    cy.findByRole('button', { name: 'Resend invitation' }).should('be.visible');

    state.operators[1] = { ...state.operators[1], activatedAt: '2026-07-04T14:00:00.000Z' };
    cy.reload();
    cy.findByRole('button', { name: 'Activate' }).click();
    cy.findByRole('dialog', { name: 'Activate Sam Support' }).should(
      'contain.text',
      'regains Backoffice access'
    );
    cy.findByRole('button', { name: 'Confirm' }).click();
    cy.wait('@activateSupport');
    cy.findByRole('status').should('contain.text', 'Sam Support was activated');
    cy.contains('Active').should('be.visible');
  });

  it("communicates that role changes invalidate the target operator's old session", () => {
    const state = {
      operators: [
        operator({ id: '1', name: 'Alice Admin', role: 'ADMINISTRATOR', active: true }),
        operator({ id: '2', name: 'Sam Support', role: 'SUPPORT', active: true })
      ]
    };
    interceptOperators(state);
    cy.intercept('PATCH', 'http://localhost:3000/admin/users/2/role', (request) => {
      expect(request.body).to.deep.equal({ role: 'FINANCE' });
      state.operators = state.operators.map((item) =>
        item.id === '2' ? { ...item, role: 'FINANCE' } : item
      );
      request.reply({ statusCode: 200, body: { operator: state.operators[1] } });
    }).as('changeRole');

    visitOperators();
    cy.contains('tr', 'Sam Support').within(() => {
      cy.findByLabelText('Role for Sam Support').select('Finance');
      cy.findByRole('button', { name: 'Change role' }).click();
    });
    cy.findByRole('dialog', { name: "Change Sam Support's role" }).should(
      'contain.text',
      'old Backoffice sessions are invalidated immediately'
    );
    cy.findByRole('button', { name: 'Confirm' }).click();
    cy.wait('@changeRole');
    cy.findByRole('status').should('contain.text', 'Old sessions were invalidated');
  });

  it('identifies the affected operator and consequence before deactivation', () => {
    const state = {
      operators: [
        operator({ id: '1', name: 'Alice Admin', role: 'ADMINISTRATOR', active: true }),
        operator({ id: '2', name: 'Sam Support', role: 'SUPPORT', active: true })
      ]
    };
    interceptOperators(state);

    visitOperators();
    cy.contains('tr', 'Sam Support').within(() => {
      cy.findByRole('button', { name: 'Deactivate' }).click();
    });

    cy.findByRole('dialog', { name: 'Deactivate Sam Support' })
      .should('contain.text', 'Sam Support loses Backoffice access immediately')
      .and('contain.text', 'existing sessions stop working');
  });
});

function visitOperators(): void {
  cy.visit('/operators', {
    onBeforeLoad: (window) => {
      window.localStorage.setItem('proxi.backoffice.dev.adminToken', adminToken);
      window.localStorage.setItem(
        'proxi.backoffice.dev.adminToken.identity',
        JSON.stringify(
          operator({
            id: '42',
            name: 'Admin Operator',
            email: 'admin@example.com',
            role: 'ADMINISTRATOR',
            active: true
          })
        )
      );
    }
  });
}

function interceptOperators(state: { operators: OperatorFixture[] }): void {
  cy.intercept('GET', 'http://localhost:3000/admin/users*', () => ({
    statusCode: 200,
    body: {
      data: state.operators,
      meta: {
        total: state.operators.length,
        page: 1,
        limit: 25,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false
      }
    }
  })).as('operators');
}

function operator(overrides: Partial<OperatorFixture> = {}): OperatorFixture {
  return { ...baseOperator(), ...overrides };
}

function baseOperator(): OperatorFixture {
  return {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'ADMINISTRATOR' as AdminRole,
    active: true,
    activatedAt: '2026-07-04T12:00:00.000Z'
  };
}
