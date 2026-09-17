export default class RegisterProfileFormElements {
  constructor(private readonly user: any) {}

  get nameInput() {
    return cy.get('#name-input');
  }

  get phoneInput() {
    return cy.get('#phone-input');
  }

  get emailInput() {
    return cy.get('#email-input');
  }

  get passwordInput() {
    return cy.get('#password-input');
  }

  get confirmPasswordInput() {
    return cy.get('#confirmPassword-input');
  }

  get documentNumberInput() {
    return cy.get('#documentNumber-input');
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
    this.passwordInput.type(String(this.user.password));
    this.confirmPasswordInput.type(String(this.user.password));
    this.documentNumberInput.type(this.user.cpf);
  }
}
