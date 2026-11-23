/// <reference types="cypress" />

import {
  enderecos,
  entrarNaJornada,
  esperarBuscaInicial,
  esperarEncerrada,
  prestadores,
  respostaDaBusca,
  respostaSegurada,
} from '../../support/api/jornada-cliente';
import { apiUrl } from '../../support/api/stub-base';

const busca = '/customer/search?categoria=limpeza';
const porCategoria = `${apiUrl}/provider/by-category/limpeza*`;
const [ana, bruno, carla] = prestadores;
const cards = () => cy.get('tg-provider-card');
const abrirFiltros = () => {
  cy.findByRole('button', { name: /^Filtros/ }).click();
  return cy.findByRole('dialog', { name: 'Filtros' }).should('be.visible');
};
const origem = (endereco: { lat: number; lng: number }) => ({
  lat: String(endereco.lat),
  lng: String(endereco.lng),
});

/** Os cards na ordem da tela, pelo nome. */
function mostraOsCards(nomes: string[]) {
  cards().should(($cards) => {
    const naTela = $cards.map((_, card) => card.querySelector('a')?.textContent?.trim()).get();
    expect(naTela).to.deep.equal(nomes);
  });
}

/**
 * O mapa pronto (o Leaflet carrega sob demanda) e com um marcador por
 * profissional da busca atual, além do marcador de onde a pessoa está.
 */
function mapaMostra(nomes: string[], ondeEstou = enderecos[0].label) {
  cy.get('.proxi-map__canvas--ready').should('exist');
  cy.get('.proxi-map__fallback').should('not.exist');
  cy.get('.leaflet-marker-icon').should(($marcadores) => {
    const titulos = $marcadores.map((_, marcador) => marcador.getAttribute('title')).get();
    expect(titulos.sort()).to.deep.equal([...nomes, ondeEstou].sort());
  });
}

describe('Busca de profissionais', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
  });

  it('busca perto do endereço principal, do mais próximo ao mais distante, e abre o agendamento', () => {
    entrarNaJornada(busca);

    esperarBuscaInicial();
    cy.findByRole('heading', { level: 2, name: '3 profissionais' }).should('be.visible');
    mostraOsCards(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
    cy.findByRole('button', { name: 'Limpeza' }).should('have.attr', 'aria-pressed', 'true');

    cy.findByRole('link', { name: 'Ana Limpeza' }).click();
    cy.location('pathname').should('eq', '/customer/20');
    cy.wait('@agenda');
  });

  it('combina nota, distância e preço, guarda os filtros na URL e permite limpá-los', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
    cy.intercept('GET', porCategoria, (req) => {
      req.reply(respostaDaBusca(prestadores, req.query, 'limpeza'));
    }).as('comFiltros');

    abrirFiltros().within(() => {
      cy.findByRole('button', { name: '4 estrelas ou mais' }).click();
      cy.findByRole('button', { name: 'Até 10 km' }).click();
      cy.get('#search-price-min').type('100');
      cy.findByRole('button', { name: 'Ver profissionais' }).click();
    });

    cy.location('search')
      .should('include', 'minimumRating=4')
      .and('include', 'maximumDistance=10')
      .and('include', 'minimumPrice=100');
    // Aplicar refaz a busca do mesmo lugar, com os filtros para a API cortar.
    cy.wait('@comFiltros')
      .its('request.query')
      .should('include', {
        ...origem(enderecos[0]),
        minimumRating: '4',
        maximumDistance: '10',
        minimumPrice: '100',
      });
    mostraOsCards(['Ana Limpeza']);
    cy.findByRole('button', { name: 'Filtros · 3' }).should('be.visible');

    cy.reload();
    mostraOsCards(['Ana Limpeza']);
    abrirFiltros().within(() => {
      cy.findByRole('button', { name: '4 estrelas ou mais' }).should(
        'have.attr',
        'aria-pressed',
        'true',
      );
      cy.get('#search-price-min').should('have.value', '100');
      cy.findByRole('button', { name: 'Limpar' }).click();
      cy.findByRole('button', { name: 'Ver profissionais' }).click();
    });

    cy.location('search').should('eq', '?categoria=limpeza');
    mostraOsCards(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
  });

  it('mostra a busca vazia e volta a listar ao limpar os filtros', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
    cy.intercept('GET', porCategoria, (req) => {
      req.reply(respostaDaBusca(prestadores, req.query, 'limpeza'));
    }).as('precoMaximo');

    abrirFiltros().within(() => {
      cy.get('#search-price-max').type('50');
      cy.findByRole('button', { name: 'Ver profissionais' }).click();
    });

    cy.wait('@precoMaximo').its('request.query').should('include', { maximumPrice: '50' });
    cy.findByRole('heading', { name: 'Ninguém com esses filtros' }).should('be.visible');
    cards().should('not.exist');
    cy.findByRole('button', { name: 'Limpar filtros' }).click();

    // Limpar tira também a categoria: a busca passa a ser por todos.
    cy.wait('@todos').its('request.query').should('include', origem(enderecos[0]));
    cy.location('search').should('eq', '');
    cards().should('have.length', 3);
  });

  it('não deixa aplicar preço máximo menor que o mínimo', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();

    abrirFiltros().within(() => {
      cy.get('#search-price-min').type('200');
      cy.get('#search-price-max').type('100');
      cy.contains('O máximo precisa ser maior que o mínimo.').should('be.visible');
      cy.findByRole('button', { name: 'Ver profissionais' }).should('be.disabled');
    });
  });

  it('troca a categoria e mostra o resultado da busca nova', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
    cy.intercept({ method: 'GET', pathname: '/provider' }, [bruno]).as('semCategoria');
    cy.intercept('GET', porCategoria, [ana]).as('deVoltaLimpeza');

    cy.findByRole('button', { name: 'Todas' }).click();
    cy.wait('@semCategoria').its('request.query').should('include', origem(enderecos[0]));
    cy.location('search').should('eq', '');
    cy.findByRole('button', { name: 'Todas' }).should('have.attr', 'aria-pressed', 'true');
    mostraOsCards(['Bruno Limpeza']);

    cy.findByRole('button', { name: 'Limpeza' }).click();
    cy.wait('@deVoltaLimpeza').its('request.query').should('include', origem(enderecos[0]));
    cy.location('search').should('eq', '?categoria=limpeza');
    mostraOsCards(['Ana Limpeza']);
  });

  it('busca a partir de outro endereço cadastrado', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
    cy.intercept('GET', porCategoria, [carla]).as('outroEndereco');

    abrirFiltros().within(() => {
      cy.get('#search-address').should('have.value', enderecos[0].id);
      cy.get('#search-address').select(enderecos[1].id);
    });

    cy.wait('@outroEndereco').its('request.query').should('include', origem(enderecos[1]));
    mostraOsCards(['Carla Limpeza']);
  });

  it('ignora a resposta atrasada da busca anterior quando o endereço muda', () => {
    const casa = respostaSegurada();
    entrarNaJornada(busca, () => {
      cy.intercept('GET', porCategoria, (req) => {
        if (req.query['lat'] === String(enderecos[0].lat)) {
          return casa.pronta.then(() => req.reply(prestadores));
        }
        req.reply(req.query['lat'] === String(enderecos[1].lat) ? [carla] : []);
      }).as('busca');
    });
    // A busca pelo endereço principal saiu e ficou sem resposta.
    cy.get('@busca.all').should((chamadas: any) => {
      expect(chamadas.map((c: any) => c.request.query.lat)).to.include(String(enderecos[0].lat));
    });

    abrirFiltros().within(() => cy.get('#search-address').select(enderecos[1].id));
    mostraOsCards(['Carla Limpeza']);

    cy.then(() => casa.liberar());
    esperarEncerrada('@busca', (c) => c.request.query.lat === String(enderecos[0].lat));
    mostraOsCards(['Carla Limpeza']);
  });

  it('busca pela localização do aparelho quando o cliente permite', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((sucesso) => {
        sucesso({ coords: { latitude: -22.9, longitude: -43.2 } });
      });
    });
    cy.intercept('GET', porCategoria, [bruno]).as('aparelho');

    abrirFiltros().within(() => {
      cy.findByRole('button', { name: 'Usar minha localização atual' }).click();
      cy.contains('Usando a localização atual do aparelho.').should('be.visible');
      cy.get('#search-address option:selected').should(
        'contain.text',
        'Localização atual do aparelho',
      );
    });

    cy.wait('@aparelho').its('request.query').should('include', { lat: '-22.9', lng: '-43.2' });
    mostraOsCards(['Bruno Limpeza']);
  });

  it('mantém o endereço quando o acesso à localização é negado', () => {
    entrarNaJornada(busca);
    esperarBuscaInicial();
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
      cy.intercept('GET', porCategoria, { statusCode: 503, body: {} }).as('falha');
    });
    // As duas buscas da abertura falham; a nova tentativa é a próxima chamada.
    esperarBuscaInicial('@falha');

    cy.contains('tg-alert', 'Não foi possível buscar os profissionais').should('be.visible');
    cy.intercept('GET', porCategoria, [ana]).as('novaTentativa');
    cy.findByRole('button', { name: 'Tentar de novo' }).click();

    cy.wait('@novaTentativa').its('request.query').should('include', origem(enderecos[0]));
    mostraOsCards(['Ana Limpeza']);
    cy.contains('tg-alert', 'Não foi possível buscar os profissionais').should('not.exist');
  });

  describe('mapa', () => {
    it('marca cada profissional da busca e abre o agendamento pelo marcador', () => {
      entrarNaJornada(busca);
      esperarBuscaInicial();

      mapaMostra(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
      cy.get('.leaflet-marker-icon[title="Ana Limpeza"]').click();
      cy.contains('.proxi-map-popup', 'Ana Limpeza').should('be.visible');
      cy.get('[aria-label="Ver perfil de Ana Limpeza"]').click();
      cy.location('pathname').should('eq', '/customer/20');
    });

    it('atualiza os marcadores quando o resultado muda', () => {
      entrarNaJornada(busca);
      esperarBuscaInicial();
      mapaMostra(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);

      abrirFiltros().within(() => {
        cy.findByRole('button', { name: '4 estrelas ou mais' }).click();
        cy.findByRole('button', { name: 'Ver profissionais' }).click();
      });

      mostraOsCards(['Ana Limpeza', 'Carla Limpeza']);
      mapaMostra(['Ana Limpeza', 'Carla Limpeza']);
    });

    it('avisa quando nenhum profissional tem localização e marca só onde a pessoa está', () => {
      const semLocal = prestadores.map((p) => ({ ...p, locations: [] }));
      entrarNaJornada(busca, () => cy.intercept('GET', porCategoria, semLocal).as('prestadores'));
      esperarBuscaInicial();

      cards().should('have.length', 3);
      cy.contains('Nenhum profissional com localização para mostrar no mapa.')
        .scrollIntoView()
        .should('be.visible');
      mapaMostra([]);
    });

    it('separa lista e mapa em abas no celular', () => {
      cy.viewport(390, 844);
      entrarNaJornada(busca);
      esperarBuscaInicial();

      cy.findByRole('tab', { name: 'Lista' }).should('have.attr', 'aria-selected', 'true');
      cards().should('have.length', 3);
      cy.findByRole('tab', { name: 'Mapa' }).click();
      cy.findByRole('tab', { name: 'Mapa' }).should('have.attr', 'aria-selected', 'true');
      cy.get('section.search__map').should('be.visible');
      mapaMostra(['Ana Limpeza', 'Bruno Limpeza', 'Carla Limpeza']);
    });
  });
});
