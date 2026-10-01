// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// These browser scenarios stub the API; real cookie authority is tested by verify-http.cjs.
beforeEach(() => {
  let storage: Storage | undefined;
  cy.on('window:before:load', (win) => {
    storage = win.localStorage;
  });
  cy.intercept('GET', 'http://localhost:3000/auth/me', (request) => {
    const saved = JSON.parse(storage?.getItem('@ODIN/USER') ?? '{}');
    request.reply({ statusCode: saved.user?.id ? 200 : 401, body: saved.user ?? {} });
  });
  cy.intercept('POST', 'http://localhost:3000/auth/logout', {
    statusCode: 201,
    body: { success: true },
  });
});
