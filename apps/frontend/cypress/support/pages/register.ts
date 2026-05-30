export default class RegisterElements {

  constructor(private readonly user: any) { }

  get toFormLoginButton() {
    return cy.get('#PROVIDER-login-button-button');
  }

  get toFormRegisterButton() {
    return cy.get('#PROVIDER-register-button-button');
  }

  get toCustomerFormLoginButton() {
    return cy.get('#CUSTOMER-login-button-button');
  }

  get toCustomerFormRegisterButton() {
    return cy.get('#CUSTOMER-register-button-button');
  }

  get providerBadge() {
    return cy.get('#badge-provider .badge');
  }

  get customerBadge() {
    return cy.get('#badge-customer .badge');
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
    return cy.get('#register-form_footer_button button');
  }

  get loginLink() {
    return cy.get('#register-form_footer_link');
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
    return cy.get('.alert');
  }
}
