/// <reference types="cypress" />

import { enderecos, entrarNaJornada, prestadores } from '../../support/api/jornada-cliente';
import { apiUrl } from '../../support/api/stub-base';

const busca = '/customer/search?categoria=limpeza';
const cards = () => cy.get('tg-provider-card');

/**
 * Confere que alguma busca já saiu com esta origem. A tela refaz a busca
 * quando os endereços chegam, então a primeira chamada do alias pode ser
 * uma anterior à troca.
 */
function buscouDe(alias: string, lat: string | number, lng: string | number) {
  cy.get(`${alias}.all`).should((chamadas) => {
    const origens = chamadas.map((c: any) => `${c.request.query.lat},${c.request.query.lng}`);
    expect(origens).to.include(`${lat},${lng}`);
  });
}
const abrirFiltros = () => {
  cy.findByRole('button', { name: /^Filtros/ }).click();
  return cy.findByRole('dialog', { name: 'Filtros' }).should('be.visible');
};

describe('Busca de profissionais', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
  });

  it('busca perto do endereço principal, do mais próximo ao mais distante, e abre o agendamento', () => {
    entrarNaJornada(busca);

    cy.findByRole('heading', { level: 2, name: '3 profissionais' }).should('be.visible');
    // A primeira busca sai antes de os endereços chegarem; a seguinte usa o principal.
    cy.get('@prestadores.all').should((chamadas) => {
      const origens = chamadas.map((c: any) => c.request.query);
      expect(origens).to.deep.include({ lat: String(enderecos[0].lat), lng: String(enderecos[0].lng) });
    });
    cy.findByRole('heading', { level: 2, name: '3 profissionais' }).should('be.visible');
    cards().should('have.length', 3);
    cards().eq(0).should('contain.text', 'Ana Limpeza');
    cards().eq(1).should('contain.text', 'Bruno Limpeza');
    cards().eq(2).should('contain.text', 'Carla Limpeza');
    cy.findByRole('button', { name: 'Limpeza' }).should('have.attr', 'aria-pressed', 'true');

    cy.findByRole('link', { name: 'Ana Limpeza' }).click();
    cy.location('pathname').should('eq', '/customer/20');
    cy.wait('@agenda');
  });

  it('combina nota, distância e preço, guarda os filtros na URL e permite limpá-los', () => {
    entrarNaJornada(busca);
    cards().should('have.length', 3);

    abrirFiltros().within(() => {
      cy.findByRole('button', { name: '4 estrelas ou mais' }).click();
      cy.findByRole('button', { name: 'Até 10 km' }).click();
      cy.get('#search-price-min').type('100');
      cy.findByRole('button', { name: 'Ver 1 profissional' }).click();
    });

    cy.location('search')
      .should('include', 'minimumRating=4')
      .and('include', 'maximumDistance=10')
      .and('include', 'minimumPrice=100');
    cards().should('have.length', 1).and('contain.text', 'Ana Limpeza');
    cy.findByRole('button', { name: 'Filtros · 3' }).should('be.visible');

    cy.reload();
    cards().should('have.length', 1);
    abrirFiltros().within(() => {
      cy.findByRole('button', { name: '4 estrelas ou mais' }).should('have.attr', 'aria-pressed', 'true');
      cy.get('#search-price-min').should('have.value', '100');
      cy.findByRole('button', { name: 'Limpar' }).click();
      cy.findByRole('button', { name: 'Ver 3 profissionais' }).click();
    });

    cy.location('search').should('eq', '?categoria=limpeza');
    cards().should('have.length', 3);
  });

  it('mostra a busca vazia e volta a listar ao limpar os filtros', () => {
    entrarNaJornada(busca);
    cards().should('have.length', 3);

    abrirFiltros().within(() => {
      cy.get('#search-price-max').type('50');
      cy.findByRole('button', { name: 'Ver 0 profissionais' }).click();
    });

    cy.findByRole('heading', { name: 'Ninguém com esses filtros' }).should('be.visible');
    cards().should('not.exist');
    cy.findByRole('button', { name: 'Limpar filtros' }).click();

    // Limpar tira também a categoria: a busca passa a ser por todos.
    cy.wait('@todos');
    cy.location('search').should('eq', '');
    cards().should('have.length', 3);
  });

  it('não deixa aplicar preço máximo menor que o mínimo', () => {
    entrarNaJornada(busca);
    cards().should('have.length', 3);

    abrirFiltros().within(() => {
      cy.get('#search-price-min').type('200');
      cy.get('#search-price-max').type('100');
      cy.contains('O máximo precisa ser maior que o mínimo.').should('be.visible');
      cy.findByRole('button', { name: /^Ver \d+ profissiona/ }).should('be.disabled');
    });
  });

  it('busca a partir de outro endereço cadastrado', () => {
    entrarNaJornada(busca);
    cy.wait('@prestadores');

    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, prestadores).as('outroEndereco');
    abrirFiltros().within(() => {
      cy.get('#search-address').should('have.value', enderecos[0].id);
      cy.get('#search-address').select(enderecos[1].id);
    });

    buscouDe('@outroEndereco', enderecos[1].lat, enderecos[1].lng);
  });

  it('busca pela localização do aparelho quando o cliente permite', () => {
    entrarNaJornada(busca);
    cy.wait('@prestadores');
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((sucesso) => {
        sucesso({ coords: { latitude: -22.9, longitude: -43.2 } });
      });
    });
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, prestadores).as('aparelho');

    abrirFiltros().within(() => {
      cy.findByRole('button', { name: 'Usar minha localização atual' }).click();
      cy.contains('Usando a localização atual do aparelho.').should('be.visible');
      cy.get('#search-address option:selected').should('contain.text', 'Localização atual do aparelho');
    });

    buscouDe('@aparelho', '-22.9', '-43.2');
  });

  it('mantém o endereço quando o acesso à localização é negado', () => {
    entrarNaJornada(busca);
    cy.wait('@prestadores');
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((_sucesso, erro) => {
        erro({ code: 1, message: 'Permission denied' });
      });
    });

    abrirFiltros().within(() => {
      cy.findByRole('button', { name: 'Usar minha localização atual' }).click();
      cy.contains('Não foi possível obter sua localização.').should('be.visible');
      cy.get('#search-address').should('have.value', enderecos[0].id);
    });
  });

  it('permite tentar de novo quando a busca falha', () => {
    entrarNaJornada(busca, () => {
      cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, {
        statusCode: 503,
        body: {},
      }).as('falha');
    });
    cy.wait('@falha');

    cy.contains('tg-alert', 'Não foi possível buscar os profissionais').should('be.visible');
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, prestadores).as('novaTentativa');
    cy.findByRole('button', { name: 'Tentar de novo' }).click();

    cy.wait('@novaTentativa');
    cards().should('have.length', 3);
    cy.contains('tg-alert', 'Não foi possível buscar os profissionais').should('not.exist');
  });

  it('abre o agendamento pelo marcador do profissional no mapa', () => {
    entrarNaJornada(busca);
    cards().should('have.length', 3);

    cy.get('.leaflet-marker-icon[title="Ana Limpeza"]').click();
    cy.contains('.proxi-map-popup', 'Ana Limpeza').should('be.visible');
    cy.get('[aria-label="Ver perfil de Ana Limpeza"]').click();
    cy.location('pathname').should('eq', '/customer/20');
  });

  it('separa lista e mapa em abas no celular', () => {
    cy.viewport(390, 844);
    entrarNaJornada(busca);

    cy.findByRole('tab', { name: 'Lista' }).should('have.attr', 'aria-selected', 'true');
    cards().should('have.length', 3);
    cy.findByRole('tab', { name: 'Mapa' }).click();
    cy.get('section.search__map').should('be.visible');
    cy.get('.leaflet-marker-icon[title="Ana Limpeza"]').should('exist');
  });
});
