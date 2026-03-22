import { register } from "module";
import LoginElements from "../support/pages/login";
import RegisterElements from "../support/pages/register";
import RegisterProfileFormElements from "../support/pages/register-profile-form";

const client = require('../fixtures/client-users.json')[0];
const error = require('../fixtures/login-error.json');

describe('Auth jorney - ', () => {
  let registerElements: RegisterElements;

  beforeEach(() => {
    cy.visit(`http://localhost:4200/authenticate`);
    registerElements = new RegisterElements(client);
  });

  describe('Test navigation', () => {
    it("should to login form", () => {
      registerElements.toFormLoginButton.click();
      cy.url().should('include', '/authenticate/login');
    });

    it("should to register form", () => {
      registerElements.toFormRegisterButton.click();
      cy.url().should('include', '/authenticate/register');
    });

    it("should redirect to login form", () => {
      registerElements.toFormRegisterButton.click();
      registerElements.loginLink.click();
      cy.url().should('include', '/authenticate/login');
    });

    it("should redirect to register form", () => {
      registerElements.toFormLoginButton.click();
      registerElements.registerLink.click();
      cy.url().should('include', '/authenticate/register');
    });

    it('should redirect to profile step', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.profileStep.click();
      cy.url().should('include', '/authenticate/profile');
    });

    it('should redirect to contact step', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.contactStep.click();
      cy.url().should('include', '/authenticate/contact');
    });

    it('should redirect to address step', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.addressStep.click();
      cy.url().should('include', '/authenticate/address');
    });

    it('should redirect to category step', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.categoryStep.click();
      cy.url().should('include', '/authenticate/category');
    });

    xit('should redirect to forgot password page', () => {
      registerElements.toFormLoginButton.click();
      registerElements.forgotPasswordLink.click();
      cy.url().should('include', '/authenticate/forgot-password');
    });
  });

  describe('Test form validation', () => {
    it('should show category-step when user is profile', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.categoryStep.should('be.visible');
    });

    it('should hide category-step when profile is client', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.customerBadge.click();
      registerElements.customerBadge.click();
      registerElements.categoryStep.should('not.exist');
    });

    it('should initialize with submit button disabled', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.registerButton.should('be.disabled');
    });
  });

  describe('Test Profile form', () => {
    let registerProfileFormElements: RegisterProfileFormElements;

    beforeEach(() => {
      registerProfileFormElements = new RegisterProfileFormElements(client);
    });

    it('should initialize with submit button disabled in profile form', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.profileStep.click();
      registerProfileFormElements.submitButton.should('be.disabled');
    });

    it('should show back button', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.profileStep.click();
      registerProfileFormElements.backButton.should('be.visible');
    });

    it('should fill profile form and enable submit button', () => {
      registerElements.toFormRegisterButton.click();
      registerElements.profileStep.click();
      registerProfileFormElements.fillForm();
      registerProfileFormElements.submitButton.should('be.enabled');
    });
  });
});
