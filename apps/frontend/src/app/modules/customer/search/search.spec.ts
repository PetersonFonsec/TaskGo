import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Search } from './search';
import { ProxiMapComponent, ProxiMapLocation, ProxiMapProvider } from '@shared/components/ui/proxi-map/proxi-map.component';
import { Provider } from '@shared/service/provider/provider';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-proxi-map',
  standalone: true,
  template: '',
})
class ProxiMapStubComponent {
  @Input() userLocation: ProxiMapLocation | null = null;
  @Input() providers: ProxiMapProvider[] = [];
  @Output() viewProfile = new EventEmitter<ProxiMapProvider['id']>();
}

const validProvider = {
  id: 'provider-1',
  user: {
    id: 'user-provider-1',
    name: 'Ana Martins',
    phone: '11999999999',
    photoUrl: '/ana.jpg',
    provider: {
      ratingAvg: '4.8',
      verified: true,
    },
  },
  services: [{ name: 'Encanadora', price: '120' }],
  lat: '-23.55052',
  lng: '-46.633308',
  distanceKm: '3.5',
  isPremium: true,
};

describe('Search', () => {
  let component: Search;
  let fixture: ComponentFixture<Search>;
  let providerMock: any;
  let geolocalizationMock: any;
  let userLoggedMock: any;
  let routerMock: any;
  let providersResponse: any[];

  beforeEach(async () => {
    providersResponse = [{ ...validProvider }];

    providerMock = {
      findProvidersByCategorySlug: jasmine
        .createSpy('findProvidersByCategorySlug')
        .and.callFake(() => of(providersResponse)),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine.createSpy('listFavorites').and.returnValue(of({ items: [{ providerId: 'provider-1' }] })),
    };

    geolocalizationMock = {
      getCurrentPosition: jasmine.createSpy('getCurrentPosition').and.returnValue(of({
        latitude: -23.551,
        longitude: -46.634,
      })),
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({
        user: {
          id: 'client-1',
          addresses: [{
            isDefault: true,
            latitude: -23.552,
            longitude: -46.635,
          }],
        },
      }),
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        { provide: Provider, useValue: providerMock },
        { provide: Geolocalization, useValue: geolocalizationMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({ categoria: 'encanadores' }) } },
      ],
    })
      .overrideComponent(Search, {
        remove: { imports: [ProxiMapComponent] },
        add: { imports: [ProxiMapStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should map valid provider data into the map contract', () => {
    fixture.detectChanges();

    expect(component.mapProviders()).toEqual([jasmine.objectContaining({
      id: 'provider-1',
      name: 'Ana Martins',
      service: 'Encanadora',
      rating: 4.8,
      priceFrom: 120,
      lat: -23.55052,
      lng: -46.633308,
      distanceKm: 3.5,
      photoUrl: '/ana.jpg',
      premium: true,
      verified: true,
    })]);
  });

  it('should filter providers with invalid coordinates from the map contract', () => {
    providersResponse = [
      { ...validProvider, id: 'missing-lat', lat: undefined },
      { ...validProvider, id: 'null-lng', lng: null },
      { ...validProvider, id: 'not-number', lat: 'abc', lng: '-46.63' },
      { ...validProvider, id: 'placeholder', lat: 0, lng: 0 },
      { ...validProvider, id: 'valid-provider' },
    ];

    fixture.detectChanges();

    expect(component.mapProviders().map((provider: ProxiMapProvider) => provider.id)).toEqual(['valid-provider']);
  });

  it('should provide safe fallback values for missing provider display fields', () => {
    providersResponse = [{
      id: 'fallback-provider',
      lat: -23.55,
      lng: -46.63,
    }];

    fixture.detectChanges();

    expect(component.mapProviders()[0]).toEqual(jasmine.objectContaining({
      id: 'fallback-provider',
      name: 'Profissional Proxi',
      service: 'encanadores',
      rating: 0,
      priceFrom: 0,
      premium: false,
      verified: false,
    }));
  });

  it('should navigate to the provider profile when the map emits viewProfile', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent)).componentInstance as ProxiMapStubComponent;
    map.viewProfile.emit('provider-1');

    expect(routerMock.navigate).toHaveBeenCalledWith(['/customer', 'provider-1']);
  });

  it('should render the map host and the provider list together', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent)).componentInstance as ProxiMapStubComponent;
    const providerCards = fixture.debugElement.queryAll(By.css('app-card-detail'));

    expect(fixture.nativeElement.querySelector('#customer-search_map')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#customer-search_providers')).toBeTruthy();
    expect(map.userLocation).toEqual({ lat: -23.552, lng: -46.635 });
    expect(map.providers.length).toBe(1);
    expect(providerCards.length).toBe(1);
  });

  it('should render the empty map message outside the map when no providers have valid locations', () => {
    providersResponse = [];

    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.customer-search_empty-map');

    expect(emptyMessage?.textContent).toContain('Nenhum prestador com localização disponível');
    expect(fixture.debugElement.query(By.directive(ProxiMapStubComponent))).toBeTruthy();
  });

  it('should load favorites for the signed-in user', () => {
    fixture.detectChanges();

    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1');
    expect(component.isFavorite('provider-1')).toBeTrue();
  });

  it('should pass onlyFavorites when the toggle is enabled', () => {
    fixture.detectChanges();

    component.toggleOnlyFavorites(true);

    expect(routerMock.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ onlyFavorites: 'true' }),
    }));
  });

  it('should persist onlyFavorites preference when toggled', () => {
    spyOn(window.localStorage, 'setItem');
    fixture.detectChanges();

    component.toggleOnlyFavorites(true);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('search.onlyFavorites.client-1', 'true');
  });

  it('should restore persisted onlyFavorites preference on init', () => {
    spyOn(window.localStorage, 'getItem').and.returnValue('true');
    fixture.detectChanges();

    expect(component.onlyFavorites()).toBeTrue();
    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith('encanadores', jasmine.objectContaining({ onlyFavorites: true }));
  });

  it('should add a favorite when toggled on', () => {
    component.favorites.set({});

    component.toggleFavorite('provider-1');

    expect(providerMock.addFavorite).toHaveBeenCalledWith('client-1', 'provider-1');
    expect(component.isFavorite('provider-1')).toBeTrue();
    expect(component.isFavoriteLoading('provider-1')).toBeFalse();
  });

  it('should remove a favorite when toggled off', () => {
    component.favorites.set({ 'provider-1': true });

    component.toggleFavorite('provider-1');

    expect(providerMock.removeFavorite).toHaveBeenCalledWith('client-1', 'provider-1');
    expect(component.isFavorite('provider-1')).toBeFalse();
    expect(component.isFavoriteLoading('provider-1')).toBeFalse();
  });

  it('should show an error message when favorite update fails', () => {
    providerMock.addFavorite.and.returnValue(throwError(() => new HttpErrorResponse({ error: { message: 'fail' } })));
    component.favorites.set({});

    component.toggleFavorite('provider-1');

    expect(component.favoriteErrorMessage('provider-1')).toBe('fail');
    expect(component.isFavorite('provider-1')).toBeFalse();
    expect(component.isFavoriteLoading('provider-1')).toBeFalse();
  });
});
