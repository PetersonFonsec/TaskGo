export default class RegisterElements {

  constructor(private readonly user: any) {

  }

  get confirmPasswordInput() {
    return cy.get('#confirm_password-input');
  }

  get loginLink() {
    return cy.get("#register-login-link");
  }

  get documentNumberInput() {
    return cy.get('#document_number-input');
  }

  get submitButton() {
    return cy.get('#register-submit-button');
  }

  get passwordInput() {
    return cy.get('#password-input');
  }

  get emailInput() {
    return cy.get('#email-input');
  }

  get nameInput() {
    return cy.get('#name-input');
  }
  get alertComponent() {
    return cy.get('.alert')
  }

  public fillFormValid() {
    this.documentNumberInput.type(this.user.documentNumber);
    this.confirmPasswordInput.type(this.user.password);
    this.passwordInput.type(this.user.password);
    this.emailInput.type(this.user.email);
    this.nameInput.type(this.user.name);
  }

  public clearFormValid() {
    this.confirmPasswordInput.clear();
    this.documentNumberInput.clear();
    this.passwordInput.clear();
    this.nameInput.clear();
  }
}
