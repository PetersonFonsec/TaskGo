/// <reference types="cypress" />

import LoginElements from "./pages/login";

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare global {
  namespace Cypress {
    interface Chainable {
      login(user: any, stub?: boolean): Chainable<void>
      createNewCollege(college: any, stub?: boolean): Chainable<void>
      // drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
    }
  }
}

Cypress.Commands.addAll({
  login(user, stub = true) {
    if (stub) {
      const users = require('../fixtures/login-response.json');
      const response = users.filter(mockedUser => mockedUser.user.email === user.email)[0];

      cy.intercept('POST', `${Cypress.env('url')}/auth/login`, {
        statusCode: 200,
        body: response
      }).as('stubLogin');
    }

    const loginElements = new LoginElements(user);
    cy.visit('http://localhost:4200/');
    cy.wait(100);

    loginElements.fillFormValid();
    cy.wait(100);

    loginElements.submitButton.click();
    cy.wait(100);
  },

  createNewCollege(college: any, stub = true) {
    cy.visit('http://localhost:4200/backoffice/create-college');

    if (stub) {
      const response = require('../fixtures/college-response-success.json');
      cy.intercept('POST', `${Cypress.env('url')}/college`, {
        statusCode: 201,
        body: response
      }).as('stubCollege');
    }
  }
});
