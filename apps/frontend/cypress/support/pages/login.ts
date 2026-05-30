export default class LoginElements {
  constructor(private readonly user: any) { }

  get forgotPasswordLink() {
    return cy.get("#forgot-password-link");
  }
  get registerLink() {
    return cy.get("#register-link");
  }
  get submitButton() {
    return cy.get('#login-form_footer button');
  }
  get alertComponent() {
    return cy.get('.alert');
  }
  get passwordInput() {
    return cy.get('#senha');
  }
  get emailInput() {
    return cy.get('#email');
  }

  public fillFormValid() {
    this.emailInput.type(String(this.user.email));
    this.passwordInput.type(String(this.user.password));
  }

  public clearForm() {
    this.emailInput.clear();
    this.passwordInput.clear();
  }
}
