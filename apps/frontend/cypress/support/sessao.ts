/// <reference types="cypress" />

import { Papel, Sessao, UsuarioDaSessao, sessao } from './api/fabricas';
import { stubBase } from './api/stub-base';

const CHAVE_TOKEN = '@ODIN/TOKEN';
const CHAVE_USUARIO = '@ODIN/USER';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Abre `caminho` já logado, sem passar pela tela de Entrar: grava o
       * token e o usuário no localStorage antes de a página carregar e
       * registra o `stubBase`. Devolve a sessão usada.
       *
       * O login pela tela fica só nos specs de autenticação.
       */
      entrarComo(
        papel: Papel,
        caminho: string,
        overrides?: Partial<UsuarioDaSessao>,
      ): Chainable<Sessao>;
    }
  }
}

Cypress.Commands.add('entrarComo', (papel: Papel, caminho: string, overrides = {}) => {
  const atual = sessao(papel, overrides);
  stubBase(atual);
  cy.visit(caminho, {
    onBeforeLoad(win) {
      win.localStorage.setItem(CHAVE_TOKEN, atual.access_token);
      win.localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atual));
    },
  });
  return cy.wrap(atual, { log: false });
});

export {};
