const adminToken = [
  btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
  btoa(JSON.stringify({ sub: '42', tokenKind: 'admin', role: 'ADMINISTRATOR', ver: 1 })).replace(
    /=+$/,
    ''
  ),
  'signature'
].join('.');

const operator = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('Backoffice authentication shell', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('redirects anonymous users to login and completes the administrative login journey', () => {
    cy.intercept('POST', 'http://localhost:3000/admin/auth/login', {
      statusCode: 201,
      body: { access_token: adminToken, operator }
    }).as('login');

    cy.visit('/unknown-route', { failOnStatusCode: false });

    cy.findByRole('heading', { name: 'Sign in to Proxi Backoffice' }).should('be.visible');
    cy.findByLabelText('Email').type('admin@example.com');
    cy.findByLabelText('Password').type('admin-password-123');
    cy.findByRole('button', { name: 'Sign in' }).click();
    cy.wait('@login');

    cy.findByRole('heading', { name: 'Page not found' }).should('be.visible');
    cy.findByRole('link', { name: /Audit log/ }).should('be.visible');
    cy.findByRole('link', { name: /Operators/ }).should('be.visible');
    cy.findByRole('link', { name: /Payments/ }).should('not.exist');
  });

  it('shows keyboard-accessible login validation errors', () => {
    cy.visit('/login');

    cy.findByRole('button', { name: 'Sign in' }).click();
    cy.findByRole('alert')
      .should('contain.text', 'Enter a valid administrative email and password.')
      .and('have.focus');
  });
});
