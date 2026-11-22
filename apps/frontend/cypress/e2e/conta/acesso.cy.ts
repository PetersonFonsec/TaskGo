/// <reference types="cypress" />

/**
 * Acesso à área logada: guardas por papel, entrada sem sessão, saída da conta
 * e a página não encontrada. As abas e o menu da conta entram no PR seguinte,
 * junto com a reescrita do antigo adaptive-navigation.
 */
describe('Acesso à área logada', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('abre o início do cliente dentro do shell', () => {
    cy.entrarComo('CLIENTE', '/customer');

    cy.location('pathname').should('eq', '/customer');
    cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
    cy.findByRole('navigation', { name: 'Principal' }).within(() => {
      cy.findByRole('link', { name: 'Início' }).should('have.attr', 'aria-current', 'page');
      cy.findByRole('link', { name: 'Buscar' }).should('exist');
      cy.findByRole('link', { name: 'Favoritos' }).should('exist');
    });
  });

  it('abre a agenda do prestador dentro do shell', () => {
    cy.entrarComo('PRESTADOR', '/provider');

    cy.location('pathname').should('eq', '/provider');
    cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
    cy.findByRole('navigation', { name: 'Principal' }).within(() => {
      cy.findByRole('link', { name: 'Agenda' }).should('have.attr', 'aria-current', 'page');
      cy.findByRole('link', { name: 'Ganhos' }).should('exist');
    });
  });

  it('leva o cliente de volta ao início dele quando abre a área do prestador', () => {
    cy.entrarComo('CLIENTE', '/provider');
    cy.location('pathname').should('eq', '/customer');
  });

  it('leva o prestador de volta ao início dele quando abre a área do cliente', () => {
    cy.entrarComo('PRESTADOR', '/customer');
    cy.location('pathname').should('eq', '/provider');
  });

  (['/customer', '/provider', '/orders/900'] as const).forEach((caminho) => {
    it(`manda para Entrar quem abre ${caminho} sem sessão, guardando o destino`, () => {
      cy.clearLocalStorage();
      cy.visit(caminho);

      cy.location('pathname').should('eq', '/authenticate/login');
      cy.location('search').should('include', `returnUrl=${encodeURIComponent(caminho)}`);
      cy.get('[data-testid="authenticated-shell"]').should('not.exist');
    });
  });

  it('sai da conta pelo menu e apaga a sessão', () => {
    cy.entrarComo('CLIENTE', '/customer');

    cy.findByRole('button', { name: /Conta de Cliente/ }).click();
    cy.findByRole('button', { name: 'Sair da conta' }).click();

    cy.location('pathname').should('match', /^\/authenticate(\/|$)/);
    cy.window().then((win) => {
      expect(win.localStorage.getItem('@ODIN/TOKEN')).to.equal(null);
      expect(win.localStorage.getItem('@ODIN/USER')).to.equal(null);
    });
  });

  it('mostra a página não encontrada com volta para o início de quem está logado', () => {
    cy.entrarComo('PRESTADOR', '/rota-que-nao-existe');

    cy.findByRole('heading', { level: 1, name: 'Página não encontrada' }).should('be.visible');
    cy.findByRole('link', { name: 'Ir para o início' }).click();
    cy.location('pathname').should('eq', '/provider');
  });
});
