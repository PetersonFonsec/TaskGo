export default class LoginElements {
  constructor(private readonly user: any) { }

  get forgotPasswordLink() {
    return cy.get("#login-forget-link");
  }
  get registerLink() {
    return cy.get("#login-register-link");
  }
  get submitButton() {
    return cy.get('#login-submit-button');
  }
  get alertComponent() {
    return cy.get('.alert');
  }
  get passwordInput() {
    return cy.get('#password-input');
  }
  get emailInput() {
    return cy.get('#email-input');
  }

  public fillFormValid() {
    this.emailInput.type(this.user.email);
    this.passwordInput.type(this.user.password);
  }

  public clearForm() {
    this.emailInput.clear();
    this.passwordInput.clear();
  }
}
