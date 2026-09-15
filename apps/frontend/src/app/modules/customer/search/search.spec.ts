import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { Address } from '@shared/service/address/address';
import { Search } from './search';
import {
  ProxiMapComponent,
  ProxiMapLocation,
  ProxiMapProvider,
} from '@shared/components/ui/proxi-map/proxi-map.component';
import { Provider } from '@shared/service/provider/provider';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { CategoryService } from '@shared/service/category/category';

@Component({
  selector: 'app-proxi-map',
  standalone: true,
  template: '',
})
class ProxiMapStubComponent {
  @Input() userLocationLabel = '';
  @Input() searchRegion: ProxiMapLocation | null = null;
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
  let addressMock: any;
  let providerMock: any;
  let geolocalizationMock: any;
  let userLoggedMock: any;
  let routerMock: any;
  let categoryServiceMock: any;
  let providersResponse: any[];
  let queryParams: BehaviorSubject<any>;

  beforeEach(async () => {
    window.localStorage.removeItem('search.onlyFavorites.client-1');
    queryParams = new BehaviorSubject<any>({ categoria: 'encanadores' });
    providersResponse = [{ ...validProvider }];

    addressMock = {
      getAddress: jasmine
        .createSpy('getAddress')
        .and.callFake(() => of({ data: userLoggedMock.user().user?.addresses ?? [] })),
    };
    providerMock = {
      findProvidersByCategorySlug: jasmine
        .createSpy('findProvidersByCategorySlug')
        .and.callFake(() => of(providersResponse)),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine
        .createSpy('listFavorites')
        .and.returnValue(of({ items: [{ providerId: 'provider-1' }] })),
    };

    geolocalizationMock = {
      getCurrentPosition: jasmine.createSpy('getCurrentPosition').and.returnValue(
        of({
          latitude: -23.551,
          longitude: -46.634,
        }),
      ),
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({
        user: {
          id: 'client-1',
          addresses: [
            {
              isDefault: true,
              latitude: -23.552,
              longitude: -46.635,
            },
          ],
        },
      }),
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    };

    categoryServiceMock = {
      getCategories: jasmine.createSpy('getCategories').and.returnValue(
        of({
          data: [{ id: 1, name: 'Encanadores', slug: 'encanadores' }],
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        { provide: Provider, useValue: providerMock },
        { provide: Address, useValue: addressMock },
        { provide: Geolocalization, useValue: geolocalizationMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams } },
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

  afterEach(() => window.localStorage.removeItem('search.onlyFavorites.client-1'));

  it('should create', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should use URL coordinates only as the search region', () => {
    queryParams.next({ lat: '-23.5505', lng: '-46.6333' });
    fixture.detectChanges();
    expect(component.userLocation()).toEqual({ lat: -23.552, lng: -46.635 });
    expect(component.searchRegion()).toEqual({ lat: -23.5505, lng: -46.6333 });
    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent)).componentInstance;
    expect(map.userLocation).toEqual({ lat: -23.552, lng: -46.635 });
    expect(map.searchRegion).toEqual({ lat: -23.5505, lng: -46.6333 });
    expect(addressMock.getAddress).toHaveBeenCalledWith('client-1');
    expect(geolocalizationMock.getCurrentPosition).not.toHaveBeenCalled();
    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith(
      undefined,
      jasmine.objectContaining({ lat: -23.5505, lng: -46.6333 }),
    );
  });

  it('should not invent a user location when permission is denied and the URL has a region', () => {
    userLoggedMock.user.and.returnValue({ user: { id: 'client-1' } });
    geolocalizationMock.getCurrentPosition.and.returnValue(throwError(() => new Error('denied')));
    queryParams.next({ lat: '-23.5505', lng: '-46.6333' });
    fixture.detectChanges();
    expect(component.userLocation()).toBeNull();
    expect(component.searchOrigin()).toEqual({ lat: -23.5505, lng: -46.6333 });
  });

  it('should keep asynchronously resolved user coordinates separate from the URL region', () => {
    const position = new Subject<{ latitude: number; longitude: number }>();
    userLoggedMock.user.and.returnValue({ user: { id: 'client-1' } });
    geolocalizationMock.getCurrentPosition.and.returnValue(position);
    queryParams.next({ lat: '-23.5505', lng: '-46.6333' });
    fixture.detectChanges();
    position.next({ latitude: -22.9, longitude: -43.2 });
    position.complete();
    expect(component.userLocation()).toEqual({ lat: -22.9, lng: -43.2 });
    expect(component.searchOrigin()).toEqual({ lat: -23.5505, lng: -46.6333 });
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(providerMock.findProvidersByCategorySlug.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ lat: -23.5505, lng: -46.6333 }),
    );
  });

  it('should request a fresh browser position even when an address exists', () => {
    queryParams.next({ lat: '-23.5505', lng: '-46.6333' });
    fixture.detectChanges();
    component.searchNearMe();
    expect(geolocalizationMock.getCurrentPosition).toHaveBeenCalled();
    expect(component.locationSource()).toBe('browser');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: { lat: null, lng: null },
        queryParamsHandling: 'merge',
      }),
    );
    queryParams.next({});
    expect(component.searchRegion()).toBeNull();
    expect(providerMock.findProvidersByCategorySlug.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ lat: -23.551, lng: -46.634 }),
    );
  });

  it('should use the current saved address instead of stale session coordinates', () => {
    addressMock.getAddress.and.returnValue(
      of({ data: [{ isDefault: true, lat: -22.9, lng: -43.2 }] }),
    );
    fixture.detectChanges();
    expect(component.userLocation()).toEqual({ lat: -22.9, lng: -43.2 });
    expect(component.userLocationLabel()).toBe('Endereço cadastrado');
    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent)).componentInstance;
    expect(map.userLocationLabel).toBe('Endereço cadastrado');
    expect(fixture.nativeElement.textContent).toContain('Usar minha localização atual');
  });

  it('should refresh providers from the browser position when no URL region exists', () => {
    fixture.detectChanges();
    component.searchNearMe();
    expect(component.userLocationLabel()).toBe('Sua localização atual');
    expect(providerMock.findProvidersByCategorySlug.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ lat: -23.551, lng: -46.634 }),
    );
  });

  it('should clear category, rating and persisted favorites together', () => {
    queryParams.next({ categoria: 'eventos-e-lazer', minimumRating: '3', onlyFavorites: 'true' });
    fixture.detectChanges();
    component.clearFilters();
    expect(component.category()).toBe('');
    expect(component.minimumRating()).toBe(0);
    expect(window.localStorage.getItem('search.onlyFavorites.client-1')).toBe('false');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({
          categoria: null,
          minimumRating: null,
          onlyFavorites: null,
        }),
      }),
    );
  });

  it('should allow deselecting the active category', () => {
    fixture.detectChanges();
    component.updateCategory('encanadores');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { categoria: null } }),
    );
  });

  it('should show categories beyond the first five', () => {
    categoryServiceMock.getCategories.and.returnValue(
      of({
        data: Array.from({ length: 6 }, (_, i) => ({
          id: i,
          name: `Categoria ${i}`,
          slug: `categoria-${i}`,
        })),
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Categoria 5');
  });

  it('should recover from a failed HTTP request on retry', () => {
    providerMock.findProvidersByCategorySlug.and.returnValue(
      throwError(() => new Error('offline')),
    );
    fixture.detectChanges();
    expect(component.searchError()).toContain('Não foi possível buscar');
    providerMock.findProvidersByCategorySlug.and.returnValue(of([validProvider]));
    component.retrySearch.next();
    expect(component.searchError()).toBe('');
    expect(component.providers().length).toBe(1);
  });

  it('should fetch saved addresses when the session has no coordinates', () => {
    userLoggedMock.user.and.returnValue({ user: { id: 'client-1' } });
    addressMock.getAddress.and.returnValue(
      of({ data: [{ isDefault: true, lat: -23.6, lng: -46.7 }] }),
    );
    fixture.detectChanges();
    expect(component.userLocation()).toEqual({ lat: -23.6, lng: -46.7 });
    expect(geolocalizationMock.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('should allow retry after geolocation fails', () => {
    userLoggedMock.user.and.returnValue({ user: { id: 'client-1' } });
    geolocalizationMock.getCurrentPosition.and.returnValue(throwError(() => new Error('denied')));
    fixture.detectChanges();
    expect(component.userLocation()).toBeNull();
    expect(component.mapProviders().length).toBe(1);
    expect(component.locationError()).toContain('Permita o acesso');
    expect(component.locationLoading()).toBeFalse();
    geolocalizationMock.getCurrentPosition.and.returnValue(
      of({ latitude: -23.5, longitude: -46.6 }),
    );
    component.requestCurrentLocation();
    expect(component.userLocation()).toEqual({ lat: -23.5, lng: -46.6 });
    expect(component.locationError()).toBe('');
  });

  it('should map valid provider data into the map contract', () => {
    fixture.detectChanges();

    expect(component.mapProviders()).toEqual([
      jasmine.objectContaining({
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
      }),
    ]);
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

    expect(component.mapProviders().map((provider: ProxiMapProvider) => provider.id)).toEqual([
      'valid-provider',
    ]);
  });

  it('should provide safe fallback values for missing provider display fields', () => {
    providersResponse = [
      {
        id: 'fallback-provider',
        lat: -23.55,
        lng: -46.63,
      },
    ];

    fixture.detectChanges();

    expect(component.mapProviders()[0]).toEqual(
      jasmine.objectContaining({
        id: 'fallback-provider',
        name: 'Profissional Proxi',
        service: 'encanadores',
        rating: 0,
        priceFrom: 0,
        premium: false,
        verified: false,
      }),
    );
  });

  it('should navigate to the provider profile when the map emits viewProfile', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent))
      .componentInstance as ProxiMapStubComponent;
    map.viewProfile.emit('provider-1');

    expect(routerMock.navigate).toHaveBeenCalledWith(['/customer', 'provider-1']);
  });

  it('should render the map host and the provider list together', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent))
      .componentInstance as ProxiMapStubComponent;
    const providerCards = fixture.debugElement.queryAll(By.css('app-card-provider'));

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

    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ onlyFavorites: 'true' }),
      }),
    );
  });

  it('should persist onlyFavorites preference when toggled', () => {
    spyOn(window.localStorage, 'setItem');
    fixture.detectChanges();

    component.toggleOnlyFavorites(true);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'search.onlyFavorites.client-1',
      'true',
    );
  });

  it('should restore persisted onlyFavorites preference on init', () => {
    spyOn(window.localStorage, 'getItem').and.returnValue('true');
    fixture.detectChanges();

    expect(component.onlyFavorites()).toBeTrue();
    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith(
      'encanadores',
      jasmine.objectContaining({ onlyFavorites: true }),
    );
  });

  it('should filter providers by minimum rating, distance and price range', () => {
    providersResponse = [
      { ...validProvider, id: 'match', distanceKm: 4, services: [{ basePrice: 120 }] },
      {
        ...validProvider,
        id: 'low-rating',
        user: { provider: { ratingAvg: 3.5 } },
        distanceKm: 4,
        services: [{ basePrice: 120 }],
      },
      { ...validProvider, id: 'far-away', distanceKm: 18, services: [{ basePrice: 120 }] },
      { ...validProvider, id: 'too-expensive', distanceKm: 4, services: [{ basePrice: 300 }] },
    ];
    fixture.detectChanges();

    component.minimumRating.set(4);
    component.maximumDistance.set(10);
    component.minimumPrice.set(100);
    component.maximumPrice.set(200);

    expect(component.providers().map((provider) => provider.id)).toEqual(['match']);
  });

  it('should filter the results locally when only favorites is enabled', () => {
    providersResponse = [validProvider, { ...validProvider, id: 'provider-2' }];
    fixture.detectChanges();

    component.onlyFavorites.set(true);

    expect(component.providers().map((provider) => provider.id)).toEqual(['provider-1']);
  });

  it('should calculate provider distance from coordinates when it is not supplied', () => {
    providersResponse = [{ ...validProvider, distanceKm: undefined }];
    fixture.detectChanges();
    component.maximumDistance.set(1);

    expect(component.providers().map((provider) => provider.id)).toEqual(['provider-1']);
  });

  it('should expose available categories and update the category query parameter', () => {
    fixture.detectChanges();

    expect(component.categories()[0].slug).toBe('encanadores');
    component.updateCategory('limpeza');
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: { categoria: 'limpeza' },
      }),
    );
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
    providerMock.addFavorite.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'fail' } })),
    );
    component.favorites.set({});

    component.toggleFavorite('provider-1');

    expect(component.favoriteErrorMessage('provider-1')).toBe('fail');
    expect(component.isFavorite('provider-1')).toBeFalse();
    expect(component.isFavoriteLoading('provider-1')).toBeFalse();
  });
});
