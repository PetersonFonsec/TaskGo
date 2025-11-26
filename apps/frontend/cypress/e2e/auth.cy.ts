import LoginElements from "../support/pages/login";
import RegisterElements from "../support/pages/register";
import WellComeElements from "../support/pages/wellcome";
import { UrlBase } from "../../src/app/shared/data/base-url";

const usuarios = require('../fixtures/usuarios.json')[0];
const error = require('../fixtures/error-login.json');

describe('Auth jorney - ', () => {
  let loginElements: LoginElements;
  let registerElements: RegisterElements;

  beforeEach(() => {
    loginElements = new LoginElements(usuarios);
    registerElements = new RegisterElements(usuarios);

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
    it("should autofocus in email field", () => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/login`);
      loginElements.emailInput.should('be.focused');
    });


    it("should autofocus in name field", () => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/cadastrar`);
      registerElements.nameInput.should('be.focused');
    });
  });


  describe('Test redirects', () => {
    beforeEach(() => {
      cy.visit('http://localhost:4200/')
    });

    it("should redirect to /login page when click in 'login' button", () => {
      WellComeElements.loginButton.click();
      cy.url().should('include', `${UrlBase.AUTHENTICATE}/login`);
    });

    it("should redirect to /cadastrar page when click in 'Cadastre-se' button", () => {
      WellComeElements.cadastroButton.click();
      cy.url().should('include', `${UrlBase.AUTHENTICATE}/cadastrar`);
    });

    it("should redirect to /recuperar-senha page when click in 'Esqueceu a senha ? Clique aqui.' link", () => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/login`);
      loginElements.forgotPasswordLink.click();
      cy.url().should('include', `${UrlBase.AUTHENTICATE}/recuperar-senha`);
    });

    it("should redirect to /cadastrar page when click in 'Ainda não tem uma conta ? Cadastre-se !' button", () => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/login`);
      loginElements.registerLink.click();
      cy.url().should('include', `${UrlBase.AUTHENTICATE}/cadastrar`);
    });

    it("should redirect to /login page when click in 'Já tem uma conta ? Entre!' button", () => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/cadastrar`);
      registerElements.loginLink.click();
      cy.url().should('include', `${UrlBase.AUTHENTICATE}/login`);
    });
  });

  describe('login form validations ', () => {
    beforeEach(() => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/login`);
      loginElements.fillFormValid();
    });

    it('Should disabled submit button when form is empty', () => {
      loginElements.clearForm();
      loginElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when email field is invalid', () => {
      loginElements.emailInput.clear().type('emailInvalid');
      loginElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when email field is empty', () => {
      loginElements.emailInput.clear();
      loginElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when password field is empty', () => {
      loginElements.passwordInput.clear();
      loginElements.submitButton.should('be.disabled');
    });

    it('Should showing alert component when service return error', () => {
      loginElements.submitButton.click();
      loginElements.alertComponent.should("be.visible");
    });

    it('Should enable submit button when form is valid', () => {
      loginElements.submitButton.should('be.enabled');
    });
  });

  describe('register form validations', () => {
    beforeEach(() => {
      cy.visit(`http://localhost:4200/${UrlBase.AUTHENTICATE}/cadastrar`);
      registerElements.fillFormValid();
    });

    it('Should disabled submit button when form is empty', () => {
      registerElements.clearFormValid();
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when email field is invalid', () => {
      registerElements.emailInput.clear().type('emailInvalid');
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when email field is empty', () => {
      registerElements.emailInput.clear();
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when password field is empty', () => {
      registerElements.passwordInput.clear();
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when "confirm_password" field is empty', () => {
      registerElements.confirmPasswordInput.clear();
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when "document_number" field is empty', () => {
      registerElements.documentNumberInput.clear();
      registerElements.submitButton.should('be.disabled');
    });

    it('Should disabled submit button when "confirm_password" is "password" are diferents', () => {
      registerElements.passwordInput.type("senha diferente");
      registerElements.submitButton.should('be.disabled');
    });

    it('Should showing alert component when service return error', () => {
      registerElements.submitButton.click();
      registerElements.alertComponent.should("be.visible");
    });

    it('Should enable submit button when form is valid', () => {
      registerElements.submitButton.should('be.enabled');
    });
  });
});
