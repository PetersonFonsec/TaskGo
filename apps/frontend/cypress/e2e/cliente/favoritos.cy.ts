/// <reference types="cypress" />

import { entrarNaJornada, prestadores } from '../../support/api/jornada-cliente';
import { apiUrl } from '../../support/api/stub-base';

type Prestador = (typeof prestadores)[number];

/**
 * Simula a lista de favoritos no servidor: `GET /favorites` devolve o que os
 * `POST` e `DELETE` deixaram, e a busca com `onlyFavorites=true` só traz eles.
 */
function servidorDeFavoritos(iniciais: Prestador[] = []) {
  let favoritos = [...iniciais];
  cy.intercept('GET', `${apiUrl}/favorites`, (req) => {
    req.reply({ items: favoritos.map((provider) => ({ providerId: provider.id, provider })), total: favoritos.length });
  }).as('listarFavoritos');
  cy.intercept('POST', `${apiUrl}/favorites`, (req) => {
    const id = String(req.body?.providerId);
    favoritos = [...favoritos.filter((p) => p.id !== id), prestadores.find((p) => p.id === id)!];
    req.reply({ statusCode: 201, body: { clientId: 'cliente-1', providerId: id } });
  }).as('favoritar');
  cy.intercept('DELETE', `${apiUrl}/favorites/*`, (req) => {
    const id = req.url.split('/').pop();
    favoritos = favoritos.filter((p) => p.id !== id);
    req.reply({ statusCode: 200, body: {} });
  }).as('desfavoritar');
  cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, (req) => {
    req.reply(req.query['onlyFavorites'] === 'true' ? favoritos : prestadores);
  }).as('prestadores');
}

const coracao = (nome: string) => cy.findByRole('button', { name: `Favoritar ${nome}` });

describe('Favoritos', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
  });

  it('favorita na busca e filtra só os favoritos, lembrando a escolha', () => {
    entrarNaJornada('/customer/search?categoria=limpeza', () => servidorDeFavoritos());
    cy.get('tg-provider-card').should('have.length', 3);

    coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'false').click();
    cy.wait('@favoritar').its('request.body').should('deep.equal', { providerId: '21' });
    coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'true');

    cy.findByRole('button', { name: /^Filtros/ }).click();
    cy.findByRole('dialog', { name: 'Filtros' }).within(() => {
      cy.findByRole('switch', { name: 'Mostrar só meus favoritos' }).check();
      cy.findByRole('button', { name: 'Ver 1 profissional' }).click();
    });

    cy.location('search').should('include', 'onlyFavorites=true');
    cy.wait('@prestadores').its('request.query').should('include', { onlyFavorites: 'true' });
    cy.get('tg-provider-card').should('have.length', 1).and('contain.text', 'Bruno Limpeza');
    cy.window()
      .its('localStorage')
      .invoke('getItem', 'search.onlyFavorites.cliente-1')
      .should('equal', 'true');
  });

  it('chega pela aba Favoritos, tira um favorito e desfaz com outro toque', () => {
    cy.entrarComo('CLIENTE', '/customer', {}, () =>
      servidorDeFavoritos([prestadores[0], prestadores[2]]),
    );

    cy.findByRole('navigation', { name: 'Principal' }).within(() => {
      cy.findByRole('link', { name: 'Favoritos' }).click();
    });
    cy.location('pathname').should('eq', '/customer/favorites');
    cy.wait('@listarFavoritos');

    cy.findByRole('heading', { level: 1, name: 'Favoritos' }).should('be.visible');
    cy.contains('2 profissionais salvos').should('be.visible');
    cy.get('tg-provider-card').should('have.length', 2);

    coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true').click();
    cy.wait('@desfavoritar').its('request.url').should('match', /\/favorites\/20$/);
    // O card fica na tela, com o coração vazio, até a pessoa sair.
    coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'false');
    cy.contains('1 profissional salvo').should('be.visible');

    coracao('Ana Limpeza').click();
    cy.wait('@favoritar').its('request.body').should('deep.equal', { providerId: '20' });
    coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true');
    cy.contains('2 profissionais salvos').should('be.visible');
  });

  it('abre o agendamento pelo card do favorito', () => {
    entrarNaJornada('/customer/favorites', () => servidorDeFavoritos([prestadores[0]]));
    cy.wait('@listarFavoritos');

    cy.findByRole('link', { name: 'Ana Limpeza' }).click();
    cy.location('pathname').should('eq', '/customer/20');
  });

  it('orienta quem ainda não tem favoritos a buscar profissionais', () => {
    cy.entrarComo('CLIENTE', '/customer/favorites');

    cy.findByRole('heading', { name: 'Nenhum favorito ainda' }).should('be.visible');
    cy.findByRole('link', { name: 'Buscar profissionais' }).click();
    cy.location('pathname').should('eq', '/customer/search');
  });

  it('mostra a falha ao carregar e recupera com Tentar de novo', () => {
    cy.entrarComo('CLIENTE', '/customer/favorites');
    // Registrado depois da visita: a primeira resposta é a vazia do stubBase.
    cy.intercept('GET', `${apiUrl}/favorites`, { statusCode: 500, body: {} }).as('falha');
    cy.reload();
    cy.wait('@falha');

    cy.contains('tg-alert', 'Não foi possível carregar seus favoritos').should('be.visible');
    servidorDeFavoritos([prestadores[1]]);
    cy.findByRole('button', { name: 'Tentar de novo' }).click();

    cy.wait('@listarFavoritos');
    cy.get('tg-provider-card').should('have.length', 1).and('contain.text', 'Bruno Limpeza');
  });
});
