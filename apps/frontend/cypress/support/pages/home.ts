import SharedElements from "./shared";

export default class HomeElements extends SharedElements {

  get jumbotronFinalizeSeuCadastro() {
    return cy.get("#home-page-jumbotron-profile");
  }

  get buttonFinalizeSeuCadastro() {
    return cy.get("#home-page-jumbotron-profile .button");
  }

  get jumbotronBemVindo() {
    return cy.get("#home-page-jumbotron-wellcome .button");
  }

  get buttonBemVindo() {
    return cy.get("#home-page-jumbotron-wellcome .button");
  }

  get cardsCollege() {
    return cy.get("#home-page li:nth-child(1) app-college-item");
  }
}
