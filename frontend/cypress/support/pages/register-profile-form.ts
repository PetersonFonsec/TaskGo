export default class RegisterProfileFormElements {

  constructor(private readonly user: any) { }

  get nameInput() {
    return cy.get('#name');
  }

  get phoneInput() {
    return cy.get('#phone');
  }

  get emailInput() {
    return cy.get('#email');
  }

  get passwordInput() {
    return cy.get('#password');
  }

  get confirmPasswordInput() {
    return cy.get('#confirmPassword');
  }

  get documentNumberInput() {
    return cy.get('#documentNumber');
  }

  get submitButton() {
    return cy.get('#profile-form_footer_submit button');
  }

  get backButton() {
    return cy.get('#profile-form_footer_back button');
  }

  fillForm() {
    this.nameInput.type(this.user.name);
    this.phoneInput.type(this.user.phone);
    this.emailInput.type(this.user.email);
    this.passwordInput.type(this.user.password);
    this.confirmPasswordInput.type(this.user.password);
    this.documentNumberInput.type(this.user.cpf);
  }
}
