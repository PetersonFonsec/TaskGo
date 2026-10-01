/// <reference types="cypress" />

import {
  addresses,
  apiUrl,
  assertOrderCreated,
  login,
  openBooking,
  openSearch,
  provider,
  providers,
  stubJourney,
  stubOrderDetails,
} from '../support/customer-journey';

// Range tracks ignore pointer events; their native thumbs remain draggable.
// Set the value and dispatch input to exercise Angular's native range binding.
describe('Jornada de busca e solicitação de visita', () => {
  beforeEach(() => {
    cy.viewport(1440, 1000);
    stubJourney();
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'celular', width: 390, height: 844 },
  ]) {
    it(`busca por categoria, consulta o perfil e solicita uma visita no ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      stubOrderDetails();
      openBooking();
      cy.contains('button', 'Ver Perfil Completo').click();
      cy.location('pathname').should('eq', '/customer/profile/20');
      cy.contains('h1', provider.user.name).should('be.visible');
      cy.contains('.services-list', 'Faxina residencial').should('be.visible');
      cy.contains('.reviews-list', 'Excelente atendimento.').should('be.visible');
      cy.get('a[href="tel:11999999999"]').should('be.visible');
      cy.contains('a', 'Agendar serviço').click();
      cy.wait('@availability');
      cy.get('#booking-request-button').should('be.disabled');
      cy.contains('.booking-slots button', '09:00').click();
      cy.get('.appointment-summary')
        .should('contain.text', 'Faxina residencial')
        .and('contain.text', '09:00')
        .and('contain.text', '120,00');
      cy.get('#booking-request-button').should('be.enabled').click();
      assertOrderCreated();
    });
  }

  it('combina avaliação, distância e preço; restaura os filtros ao recarregar e permite limpá-los', () => {
    openSearch();
    cy.contains('button', 'Filtros').click();
    cy.get('[aria-label="4 estrelas ou mais"]').click();
    cy.location('search').should('include', 'minimumRating=4');
    cy.get('[aria-label="Distância máxima em quilômetros"]')
      .invoke('val', 5)
      .trigger('input', { force: true });
    cy.location('search').should('include', 'maximumDistance=5');
    cy.get('[aria-label="Preço mínimo"]').invoke('val', 100).trigger('input', { force: true });
    cy.location('search').should('include', 'minimumPrice=100');
    cy.get('[aria-label="Preço máximo"]').invoke('val', 150).trigger('input', { force: true });
    cy.location('search').should('include', 'maximumPrice=150');
    cy.contains('button', 'Aplicar filtros').click();
    cy.get('#customer-search_providers app-card-provider')
      .should('have.length', 1)
      .and('contain.text', provider.user.name);
    cy.location('search')
      .should('include', 'minimumRating=4')
      .and('include', 'maximumDistance=5')
      .and('include', 'minimumPrice=100')
      .and('include', 'maximumPrice=150');
    cy.reload();
    cy.get('#customer-search_providers app-card-provider').should('have.length', 1);
    cy.contains('button', 'Filtros').click();
    cy.get('[aria-label="4 estrelas ou mais"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[aria-label="Preço máximo"]').should('have.value', '150');
    cy.contains('button', 'Limpar filtros').click();
    cy.location('search').should('eq', '');
    cy.contains('button', 'Aplicar filtros').click();
    cy.location('search').should('eq', '');
    cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
  });

  it('usa o endereço principal e permite buscar a partir de outro endereço', () => {
    openSearch();
    cy.contains('button', 'Filtros').click();
    cy.get('#search-address').should('have.value', addresses[0].id);
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`).as('changedLocation');
    cy.get('#search-address').select(addresses[1].id);
    cy.wait('@changedLocation')
      .its('request.query')
      .should('include', { lat: String(addresses[1].lat), lng: String(addresses[1].lng) });
    cy.contains('button', 'Aplicar filtros').click();
    cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
  });

  it('mostra busca vazia e recupera os resultados ao limpar filtros', () => {
    openSearch();
    cy.contains('button', 'Filtros').click();
    cy.get('[aria-label="Preço máximo"]').invoke('val', 25).trigger('input', { force: true });
    cy.location('search').should('include', 'maximumPrice=25');
    cy.contains('button', 'Aplicar filtros').click();
    cy.contains('Nenhum prestador corresponde aos filtros selecionados.').should('be.visible');
    cy.get('#customer-search_providers app-card-provider').should('not.exist');
    cy.contains('button', 'Filtros').click();
    cy.contains('button', 'Limpar filtros').click();
    cy.location('search').should('eq', '');
    cy.contains('button', 'Aplicar filtros').click();
    cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
  });

  it('permite tentar novamente quando a busca falha', () => {
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, { statusCode: 503, body: {} });
    // Start at home so the failure occurs through the same category navigation.
    login();
    cy.contains('a', 'Limpeza').click();
    cy.contains('[role="alert"]', 'Não foi possível buscar os profissionais.').should('be.visible');
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`, { body: providers }).as(
      'retryProviders',
    );
    cy.contains('button', 'Tentar novamente').click();
    cy.wait('@retryProviders');
    cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
    cy.get('#customer-search_providers [role="alert"]').should('not.exist');
  });

  it('abre o agendamento pelo marcador do profissional no mapa', () => {
    openSearch();
    cy.get('.leaflet-marker-icon[title="Ana Limpeza"]').click();
    cy.contains('.proxi-map-popup', 'Ana Limpeza').should('be.visible');
    cy.get('[aria-label="Ver perfil de Ana Limpeza"]').click();
    cy.location('pathname').should('eq', '/customer/20');
    cy.wait('@availability');
    cy.contains('app-provider-profile-summary', 'Ana Limpeza').should('be.visible');
  });

  it('busca pela localização do aparelho quando o cliente permite o acesso', () => {
    openSearch();
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success) => {
        success({ coords: { latitude: -22.9, longitude: -43.2 } });
      });
    });
    cy.contains('button', 'Filtros').click();
    cy.intercept('GET', `${apiUrl}/provider/by-category/limpeza*`).as('browserLocation');
    cy.contains('button', 'Usar a localização atual').click();
    cy.wait('@browserLocation')
      .its('request.query')
      .should('include', { lat: '-22.9', lng: '-43.2' });
    cy.contains('Usando a localização atual do aparelho.').should('be.visible');
    cy.get('#search-address option:selected').should(
      'contain.text',
      'Localização atual do aparelho',
    );
  });

  it('mantém a busca por endereço quando o acesso à localização é negado', () => {
    openSearch();
    cy.window().then((win) => {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((_success, error) => {
        error({ code: 1, message: 'Permission denied' });
      });
    });
    cy.contains('button', 'Filtros').click();
    cy.contains('button', 'Usar a localização atual').click();
    cy.contains('Não foi possível obter sua localização.').should('be.visible');
    cy.get('#search-address').should('have.value', addresses[0].id);
    cy.contains('button', 'Aplicar filtros').click();
    cy.get('#customer-search_providers app-card-provider').should('have.length', 3);
  });
});
