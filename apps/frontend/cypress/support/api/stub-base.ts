/// <reference types="cypress" />

import { Sessao, categoria, painelPrestadorVazio } from './fabricas';

export const apiUrl: string = Cypress.env('url');

/**
 * Respostas que qualquer tela logada consulta ao abrir: categorias,
 * endereços, favoritos, pedidos, o próprio usuário e o painel do prestador.
 * Tudo vazio por padrão; o spec sobrescreve com outro `cy.intercept` depois
 * desta chamada (o último registrado vence).
 *
 * Também corta o que depende de serviços externos: tiles do mapa e
 * telemetria. Nenhuma requisição para a API fica sem resposta.
 */
export function stubBase(sessaoAtual?: Sessao) {
  cy.intercept('GET', `${apiUrl}/categories*`, {
    data: [categoria()],
    meta: { total: 1, page: 1, limit: 10 },
  }).as('categorias');
  cy.intercept('GET', `${apiUrl}/user/me/addresses*`, {
    data: sessaoAtual?.user.addresses ?? [],
    meta: { total: sessaoAtual?.user.addresses.length ?? 0, page: 1, hasNextPage: false },
  }).as('enderecos');
  cy.intercept('GET', `${apiUrl}/favorites`, { items: [] }).as('favoritos');
  cy.intercept('GET', `${apiUrl}/order/client/*`, []).as('pedidosDoCliente');
  cy.intercept('GET', `${apiUrl}/order/provider/*`, []).as('pedidosDoPrestador');
  cy.intercept('GET', `${apiUrl}/auth/provider-home`, painelPrestadorVazio()).as(
    'painelDoPrestador',
  );
  if (sessaoAtual) {
    cy.intercept('GET', `${apiUrl}/user/${sessaoAtual.user.id}`, sessaoAtual.user).as(
      'usuario',
    );
  }

  cy.intercept('GET', 'https://*.tile.openstreetmap.org/**', { statusCode: 204 });
  cy.intercept('POST', 'http://localhost:4318/**', { statusCode: 200 });
}
