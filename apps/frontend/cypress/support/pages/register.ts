export default class RegisterElements {

  constructor(private readonly user: any) { }

  get toFormLoginButton() {
    return cy.get('#auth-login-link');
  }

  get toFormRegisterButton() {
    return cy.get('#auth-register-link');
  }

  get toCustomerFormLoginButton() {
    return cy.get('#auth-login-link');
  }

  get toCustomerFormRegisterButton() {
    return cy.get('#auth-register-link');
  }

  /** Card de escolha (label com o rádio dentro): clicar marca o tipo de conta. */
  get providerChoice() {
    return cy.get('#account-type-provider');
  }

  get customerChoice() {
    return cy.get('#account-type-customer');
  }

  get emailInput() {
    return cy.get('#email');
  }

  get passwordInput() {
    return cy.get('#password');
  }

  get forgotPasswordLink() {
    return cy.get('#forgot-password-link');
  }

  get registerLink() {
    return cy.get('#register-link');
  }

  get registerButton() {
    return cy.get('#register-submit');
  }

  get loginLink() {
    return cy.get('#register-login-link');
  }

  get profileStep() {
    return cy.get('#profile-step');
  }

  get contactStep() {
    return cy.get('#contact-step');
  }

  get addressStep() {
    return cy.get('#address-step');
  }

  get categoryStep() {
    return cy.get('#category-step');
  }

  get alertComponent() {
    return cy.get('tg-alert');
  }
}
