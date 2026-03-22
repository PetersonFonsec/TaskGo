import LoginElements from "../support/pages/login";
import RegisterElements from "../support/pages/register";

const client = require('../fixtures/client-users.json')[0];
const error = require('../fixtures/login-error.json');

describe('Auth jorney - ', () => {
  let loginElements: LoginElements;
  let registerElements: RegisterElements;

  beforeEach(() => {
    cy.intercept('POST', `${Cypress.env('url')}/auth/login`, {
      statusCode: 400,
      body: error
    }).as('stubLogin');

    cy.intercept('POST', `${Cypress.env('url')}/auth/register/director`, {
      statusCode: 400,
      body: error
    }).as('stubRegister');
  });

  describe('Test accessibility', () => {
  });
});
