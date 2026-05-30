export default class SharedElements {
  get buttonMenu() {
    return cy.get('#header-menu-button, [aria-label="Abrir menu"]').first();
  }

  get asideMenu() {
    return cy.get('aside, nav').first();
  }
}
