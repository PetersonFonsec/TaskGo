/// <reference types="cypress" />

import { pedido, prestadorPublico, sessao } from '../../support/api/fabricas';
import { agenda } from '../../support/api/jornada-cliente';
import { apiUrl, stubBase } from '../../support/api/stub-base';

/**
 * Acesso à área logada: guardas por papel, entrada sem sessão, a volta ao
 * destino depois de entrar, as abas de cada papel, o menu da conta, a saída
 * e a página não encontrada.
 */
const abas = () => cy.findByRole('navigation', { name: 'Principal' });

/** Uma só aba marcada como atual, e só uma navegação principal na tela. */
function umaAbaAtual(nome: string) {
  cy.findAllByRole('navigation', { name: 'Principal' }).should('have.length', 1);
  abas().within(() => {
    cy.get('[aria-current="page"]').should('have.length', 1).and('have.text', nome);
  });
}

/** Entra pela tela de Entrar com a API respondendo a sessão do papel. */
function entrarPelaTela(papel: 'CLIENTE' | 'PRESTADOR') {
  const atual = sessao(papel);
  stubBase(atual);
  cy.intercept('POST', `${apiUrl}/auth/login`, atual).as('login');
  cy.get('#login-email').should('have.focus').type(atual.user.email);
  cy.get('#login-password').type('senha-de-teste');
  cy.get('#login-submit').click();
  cy.wait('@login');
}

function semRolagemLateral() {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
  });
}

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

  it('troca de aba do cliente marcando a aba atual', () => {
    cy.entrarComo('CLIENTE', '/customer');

    abas().within(() => cy.findByRole('link', { name: 'Buscar' }).click());
    cy.location('pathname').should('eq', '/customer/search');
    abas().within(() => {
      cy.findByRole('link', { name: 'Buscar' }).should('have.attr', 'aria-current', 'page');
      cy.findByRole('link', { name: 'Início' }).should('not.have.attr', 'aria-current');
      cy.findByRole('link', { name: 'Pedidos' }).click();
    });
    cy.location('pathname').should('eq', '/general/cliente-1/history');
    abas().within(() => {
      cy.findByRole('link', { name: 'Pedidos' }).should('have.attr', 'aria-current', 'page');
      cy.findByRole('link', { name: 'Favoritos' }).click();
    });
    cy.location('pathname').should('eq', '/customer/favorites');
  });

  it('troca de aba do prestador marcando a aba atual', () => {
    cy.entrarComo('PRESTADOR', '/provider');

    abas().within(() => {
      cy.findAllByRole('link').should('have.length.at.least', 4);
      cy.findByRole('link', { name: 'Serviços' }).click();
    });
    cy.location('pathname').should('eq', '/provider/services');
    abas().within(() => {
      cy.findByRole('link', { name: 'Serviços' }).should('have.attr', 'aria-current', 'page');
      cy.findByRole('link', { name: 'Agenda' }).should('not.have.attr', 'aria-current');
      cy.findByRole('link', { name: 'Ganhos' }).click();
    });
    cy.location('pathname').should('eq', '/provider/recebimentos');
    abas().within(() => cy.findByRole('link', { name: 'Pedidos' }).click());
    cy.location('pathname').should('eq', '/general/prestador-1/history');
  });

  it('abre os dados pessoais e os endereços pelo menu da conta', () => {
    cy.entrarComo('CLIENTE', '/customer');

    cy.findByRole('button', { name: /Conta de Cliente/ })
      .should('have.attr', 'aria-expanded', 'false')
      .click()
      .should('have.attr', 'aria-expanded', 'true');
    cy.findByRole('link', { name: 'Dados pessoais' }).click();
    cy.location('pathname').should('eq', '/general/cliente-1/profile/view');

    cy.findByRole('button', { name: /Conta de Cliente/ }).click();
    cy.findByRole('link', { name: 'Endereços' }).click();
    cy.location('pathname').should('eq', '/general/cliente-1/addresses');
  });

  it('fecha o menu da conta com Esc', () => {
    cy.entrarComo('PRESTADOR', '/provider');

    cy.findByRole('button', { name: /Conta de Prestador/ }).click();
    cy.findByRole('link', { name: 'Dados pessoais' }).should('be.visible');
    cy.focused().type('{esc}');
    cy.contains('a', 'Dados pessoais').should('not.be.visible');
    cy.findByRole('button', { name: /Conta de Prestador/ })
      .should('have.attr', 'aria-expanded', 'false')
      .and('have.focus');
  });

  [
    { papel: 'CLIENTE' as const, inicio: '/customer', id: 'cliente-1' },
    { papel: 'PRESTADOR' as const, inicio: '/provider', id: 'prestador-1' },
  ].forEach(({ papel, inicio, id }) => {
    it(`mostra a aba Conta no celular do ${papel.toLowerCase()} sem rolagem lateral`, () => {
      cy.viewport(360, 740);
      cy.entrarComo(papel, inicio);

      abas().within(() => cy.findByRole('link', { name: 'Conta' }).click());
      cy.location('pathname').should('eq', `/general/${id}/home`);
      semRolagemLateral();
      cy.visit(inicio);
      semRolagemLateral();
    });
  });

  it('volta ao pedido que a pessoa tentou abrir depois de entrar', () => {
    cy.intercept('GET', `${apiUrl}/orders/900`, pedido()).as('pedido');
    cy.visit('/orders/900');
    cy.location('pathname').should('eq', '/authenticate/login');

    entrarPelaTela('CLIENTE');

    cy.location('pathname').should('eq', '/orders/900');
    cy.wait('@pedido');
    cy.findByRole('heading', { level: 1, name: 'Faxina residencial' }).should('be.visible');
  });

  ['/provider', '//exemplo.com/roubo', 'https://exemplo.com'].forEach((destino) => {
    it(`ignora o destino ${destino} depois de entrar e leva ao início do papel`, () => {
      cy.visit(`/authenticate/login?returnUrl=${encodeURIComponent(destino)}`);

      entrarPelaTela('CLIENTE');

      cy.location('pathname').should('eq', '/customer');
      cy.location('origin').should('eq', Cypress.config('baseUrl'));
    });
  });

  it('leva o prestador de volta ao início dele quando abre o pagamento do cliente', () => {
    cy.entrarComo('PRESTADOR', '/orders/900/payment');
    cy.location('pathname').should('eq', '/provider');
  });

  it('não mostra a navegação da conta sem sessão', () => {
    cy.visit('/authenticate/login');

    cy.get('#login-email').should('have.focus');
    cy.findByRole('navigation', { name: 'Principal' }).should('not.exist');
    cy.findByRole('button', { name: /^Conta de / }).should('not.exist');
  });

  [
    {
      caminho: '/customer/search',
      aba: 'Buscar',
      tela: () => cy.findByRole('button', { name: /^Filtros/ }),
    },
    {
      caminho: '/customer/favorites',
      aba: 'Favoritos',
      tela: () => cy.findByRole('heading', { level: 1, name: 'Favoritos' }),
    },
    { caminho: '/customer/20', aba: null, tela: () => cy.get('#booking-request-button') },
    {
      caminho: '/customer/profile/20',
      aba: null,
      tela: () => cy.findByRole('heading', { level: 1, name: 'Ana Limpeza' }),
    },
  ].forEach(({ caminho, aba, tela }) => {
    it(`abre ${caminho} direto com um só shell`, () => {
      cy.entrarComo('CLIENTE', caminho, {}, () => {
        cy.intercept('GET', `${apiUrl}/provider/20`, prestadorPublico()).as('prestador');
        cy.intercept('GET', `${apiUrl}/provider/20/availability*`, agenda()).as('agenda');
      });

      cy.location('pathname').should('eq', caminho);
      tela().should('exist');
      cy.get('[data-testid="authenticated-shell"]').should('have.length', 1);
      cy.findAllByRole('navigation', { name: 'Principal' }).should('have.length', 1);
      if (aba) umaAbaAtual(aba);
    });
  });

  [
    { largura: 1280, papel: 'CLIENTE' as const, inicio: '/customer', aba: 'Início' },
    { largura: 360, papel: 'CLIENTE' as const, inicio: '/customer', aba: 'Início' },
    { largura: 1280, papel: 'PRESTADOR' as const, inicio: '/provider', aba: 'Agenda' },
    { largura: 360, papel: 'PRESTADOR' as const, inicio: '/provider', aba: 'Agenda' },
  ].forEach(({ largura, papel, inicio, aba }) => {
    it(`marca uma só aba atual do ${papel.toLowerCase()} em ${largura}px`, () => {
      cy.viewport(largura, 800);
      cy.entrarComo(papel, inicio);

      umaAbaAtual(aba);
      abas().within(() => {
        cy.findAllByRole('link').then(($links) => {
          const nomes = $links.map((_, link) => link.textContent?.trim()).get();
          expect(new Set(nomes).size, 'sem abas repetidas').to.equal(nomes.length);
        });
      });
    });
  });
});
