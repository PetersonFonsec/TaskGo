import HomeElements from "../support/pages/home";
import ProfileElements from "../support/pages/profile";

describe("Profile - ", () => {
  const [usuarioSemRegistros] = require('../fixtures/usuarios.json');
  const error = require('../fixtures/error-login.json');

  const registerElements = new ProfileElements(usuarioSemRegistros);

  beforeEach(() => {
    cy.login(usuarioSemRegistros);
    cy.wait(100);
    cy.visit(`http://localhost:4200/studant/profile`);
  });

  it("Should be in profile page", () => {
    cy.url().should('include', '/profile');
  });

  it("the form must be previously filled out", () => {
    registerElements.emailInput.should('have.value', usuarioSemRegistros.email);
    registerElements.nameInput.should('have.value', usuarioSemRegistros.name);
  });

  it("should disable field when form is filled", () => {
    registerElements.clearForm();
    registerElements.fillFormValid();
    registerElements.submitButton.should('be.enabled');
  });

  it("should return to home", () => {
    registerElements.backButton.click();
    cy.url().should('include', '/stundant');
  });

  it("should show message error whem update profile fail", () => {
    cy.intercept('PATCH', `${Cypress.env('url')}/users`, {
      statusCode: 420,
      body: error
    }).as('errorProfile');

    registerElements.clearForm();
    registerElements.fillFormValid();
    registerElements.submitButton.click();
    registerElements.messageAlert.should('be.visible');
  });
})
