/// <reference types="cypress" />

import {
  enderecos,
  entrarNaJornada,
  esperarBuscaInicial,
  prestadores,
  respostaDaBusca,
  respostaSegurada,
} from '../../support/api/jornada-cliente';
import { apiUrl } from '../../support/api/stub-base';

type Prestador = (typeof prestadores)[number];

interface Segurar {
  /** Segura cada `GET /favorites` até a promessa resolver. */
  lista?: Promise<void>;
}

/**
 * Simula a lista de favoritos no servidor: `GET /favorites` (com ou sem a
 * paginação na query) devolve o que os `POST` e `DELETE` deixaram, e a busca
 * com `onlyFavorites=true` só traz eles, com os outros filtros aplicados.
 * `registrarBusca` registra de novo a busca com outro alias, para pegar só as
 * chamadas que vierem depois de uma ação.
 */
function servidorDeFavoritos(iniciais: Prestador[] = [], segurar: Segurar = {}) {
  let favoritos = [...iniciais];
  const segura = (promessa: Promise<void> | undefined, responder: () => void) =>
    promessa ? promessa.then(responder) : responder();

  cy.intercept('GET', `${apiUrl}/favorites*`, (req) =>
    segura(segurar.lista, () =>
      req.reply({
        items: favoritos.map((provider) => ({ providerId: provider.id, provider })),
        total: favoritos.length,
      }),
    ),
  ).as('listarFavoritos');
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

  const registrarBusca = (alias: string) =>
    cy
      .intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, (req) => {
        const lista = req.query['onlyFavorites'] === 'true' ? favoritos : prestadores;
        req.reply(respostaDaBusca(lista, req.query, 'limpeza'));
      })
      .as(alias);
  registrarBusca('prestadores');
  return { registrarBusca };
}

const coracao = (nome: string) => cy.findByRole('button', { name: `Favoritar ${nome}` });
const cards = () => cy.get('tg-provider-card');

function mostraOsCards(nomes: string[]) {
  cards().should(($cards) => {
    const naTela = $cards.map((_, card) => card.querySelector('a')?.textContent?.trim()).get();
    expect(naTela).to.deep.equal(nomes);
  });
}

const buscaFavoritos = '/customer/search?categoria=limpeza&onlyFavorites=true';
const [ana, bruno, carla] = prestadores;

describe('Favoritos', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
  });

  describe('na busca', () => {
    it('mostra os favoritos já salvos com o coração marcado', () => {
      entrarNaJornada('/customer/search?categoria=limpeza', () => servidorDeFavoritos([ana]));
      esperarBuscaInicial();

      mostraOsCards(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true');
      coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'false');
      coracao('Carla Limpeza').should('have.attr', 'aria-pressed', 'false');
    });

    it('favorita, filtra só os favoritos e lembra a escolha', () => {
      let servidor!: ReturnType<typeof servidorDeFavoritos>;
      entrarNaJornada('/customer/search?categoria=limpeza', () => {
        servidor = servidorDeFavoritos([ana]);
      });
      esperarBuscaInicial();
      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true');

      coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'false').click();
      cy.wait('@favoritar').its('request.body').should('deep.equal', { providerId: '21' });
      coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'true');

      cy.then(() => servidor.registrarBusca('buscaDosFavoritos'));
      cy.findByRole('button', { name: /^Filtros/ }).click();
      cy.findByRole('dialog', { name: 'Filtros' }).within(() => {
        cy.findByRole('switch', { name: 'Mostrar só meus favoritos' }).check();
        cy.findByRole('button', { name: 'Ver profissionais' }).click();
      });

      cy.location('search').should('include', 'onlyFavorites=true');
      cy.wait('@buscaDosFavoritos')
        .its('request.query')
        .should('include', { onlyFavorites: 'true', lat: String(enderecos[0].lat) });
      mostraOsCards(['Ana Limpeza', 'Bruno Limpeza']);
      cy.window()
        .its('localStorage')
        .invoke('getItem', 'search.onlyFavorites.cliente-1')
        .should('equal', 'true');
    });

    it('tira um favorito com o filtro ligado e ele sai da lista', () => {
      entrarNaJornada(buscaFavoritos, () => servidorDeFavoritos([ana, bruno]));
      esperarBuscaInicial();
      mostraOsCards(['Ana Limpeza', 'Bruno Limpeza']);

      coracao('Bruno Limpeza').click();
      cy.wait('@desfavoritar')
        .its('request.url')
        .should('match', /\/favorites\/21$/);
      mostraOsCards(['Ana Limpeza']);

      // O servidor também esqueceu: abrindo de novo, continua só a Ana.
      cy.reload();
      mostraOsCards(['Ana Limpeza']);
    });

    it('mostra os favoritos que a API filtrou mesmo antes da lista de favoritos chegar', () => {
      const lista = respostaSegurada();
      entrarNaJornada(buscaFavoritos, () => servidorDeFavoritos([bruno], { lista: lista.pronta }));
      esperarBuscaInicial();

      // O filtro é da API: a busca já traz só os favoritos, sem esperar a lista.
      cy.get('@listarFavoritos.all').should('have.length.at.least', 1);
      cy.findByRole('heading', { level: 2, name: '1 profissional' }).should('be.visible');
      mostraOsCards(['Bruno Limpeza']);
      cy.then(() => lista.liberar());

      cy.wait('@listarFavoritos');
      mostraOsCards(['Bruno Limpeza']);
      coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'true');
    });

    it('não deixa uma lista de favoritos atrasada desfazer o coração que a pessoa marcou', () => {
      const lista = respostaSegurada();
      entrarNaJornada('/customer/search?categoria=limpeza', () =>
        servidorDeFavoritos([], { lista: lista.pronta }),
      );
      esperarBuscaInicial();
      // A lista foi pedida antes do toque e está sem resposta.
      cy.get('@listarFavoritos.all').should('have.length.at.least', 1);

      coracao('Carla Limpeza').click();
      cy.wait('@favoritar');
      coracao('Carla Limpeza').should('have.attr', 'aria-pressed', 'true');

      // A lista velha, sem a Carla, chega agora.
      cy.then(() => lista.liberar());
      cy.get('@listarFavoritos.all').should((chamadas: any) => {
        expect(chamadas.every((c: any) => ['Complete', 'Errored'].includes(c.state))).to.equal(
          true,
        );
      });
      coracao('Carla Limpeza').should('have.attr', 'aria-pressed', 'true');
    });

    it('continua mostrando a busca quando a lista de favoritos falha', () => {
      entrarNaJornada('/customer/search?categoria=limpeza', () => {
        servidorDeFavoritos([ana]);
        cy.intercept('GET', `${apiUrl}/favorites*`, { statusCode: 500, body: {} }).as(
          'falhaFavoritos',
        );
      });
      esperarBuscaInicial();
      cy.wait('@falhaFavoritos');

      mostraOsCards(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
      cy.get('tg-alert').should('not.exist');
      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'false');

      coracao('Bruno Limpeza').click();
      cy.wait('@favoritar').its('request.body').should('deep.equal', { providerId: '21' });
      coracao('Bruno Limpeza').should('have.attr', 'aria-pressed', 'true');
    });
  });

  describe('na tela de Favoritos', () => {
    it('chega pela aba Favoritos, tira um favorito e desfaz com outro toque', () => {
      cy.entrarComo('CLIENTE', '/customer', {}, () => servidorDeFavoritos([ana, carla]));

      cy.findByRole('navigation', { name: 'Principal' }).within(() => {
        cy.findByRole('link', { name: 'Favoritos' }).click();
      });
      cy.location('pathname').should('eq', '/customer/favorites');
      cy.wait('@listarFavoritos');

      cy.findByRole('heading', { level: 1, name: 'Favoritos' }).should('be.visible');
      cy.contains('2 profissionais salvos').should('be.visible');
      mostraOsCards(['Ana Limpeza', 'Carla Limpeza']);

      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true').click();
      cy.wait('@desfavoritar')
        .its('request.url')
        .should('match', /\/favorites\/20$/);
      // O card fica na tela, com o coração vazio, até a pessoa sair.
      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'false');
      cy.contains('1 profissional salvo').should('be.visible');

      coracao('Ana Limpeza').click();
      cy.wait('@favoritar').its('request.body').should('deep.equal', { providerId: '20' });
      coracao('Ana Limpeza').should('have.attr', 'aria-pressed', 'true');
      cy.contains('2 profissionais salvos').should('be.visible');
    });

    it('abre o agendamento pelo card do favorito', () => {
      entrarNaJornada('/customer/favorites', () => servidorDeFavoritos([ana]));
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
      cy.entrarComo('CLIENTE', '/customer/favorites', {}, () => {
        cy.intercept('GET', `${apiUrl}/favorites*`, { statusCode: 500, body: {} }).as('falha');
      });
      cy.wait('@falha');

      cy.contains('tg-alert', 'Não foi possível carregar seus favoritos').should('be.visible');
      servidorDeFavoritos([bruno]);
      cy.findByRole('button', { name: 'Tentar de novo' }).click();

      cy.wait('@listarFavoritos');
      mostraOsCards(['Bruno Limpeza']);
    });
  });
});
