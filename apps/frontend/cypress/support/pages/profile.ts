import SharedElements from "./shared";

export default class ProfileElements extends SharedElements {
  constructor(private readonly user: any) { super() }

  get thumbInput() {
    return cy.get("#photo-input-upload-input-file")
  }

  set thumbInput(photo: any) {
    this.thumbInput.selectFile(photo);
  }

  get cpfInput() {
    return cy.get("#document_number-input")
  }

  get emailInput() {
    return cy.get("#email-input")
  }

  get nameInput() {
    return cy.get("#name-input")
  }

  get backButton() {
    return cy.get("#profile-back-button")
  }

  get submitButton() {
    return cy.get("#profile-submit-button-button")
  }

  get messageAlert() {
    return cy.get("#profile-alert")
  }

  public fillFormValid() {
    this.cpfInput.type(this.user.documentNumber);
    this.thumbInput.selectFile(this.user.photo);
    this.emailInput.type(this.user.email);
    this.nameInput.type(this.user.name);
  }

  public clearForm() {
    this.emailInput.clear();
    this.nameInput.clear();
    this.cpfInput.clear();
  }
}
