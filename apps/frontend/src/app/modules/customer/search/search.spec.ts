import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, config, of, Subject, throwError } from 'rxjs';

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
  id: '101',
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
  services: [
    {
      id: 's1',
      name: 'Encanadora',
      title: 'Encanadora',
      category: 'encanadores',
      basePrice: 120,
      status: 'ATIVO',
    },
  ],
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
      getAllAddresses: jasmine
        .createSpy('getAllAddresses')
        .and.callFake(() => of(userLoggedMock.user().user?.addresses ?? [])),
    };
    providerMock = {
      findProvidersByCategorySlug: jasmine
        .createSpy('findProvidersByCategorySlug')
        .and.callFake(() => of(providersResponse)),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine
        .createSpy('listFavorites')
        .and.returnValue(of({ items: [{ providerId: '101' }] })),
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
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams } },
      ],
    })
      .overrideComponent(Search, {
        remove: { imports: [ProxiMapComponent] },
        add: { imports: [ProxiMapStubComponent] },
      })
      .compileComponents();

    routerMock = TestBed.inject(Router);
    spyOn(routerMock, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
    // Tela grande por padrão (lista e mapa lado a lado); o celular tem testes próprios.
    component.wide.set(true);
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const text = (node: Element | null = el()) =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const buttonIn = (root: Element, label: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => text(b) === label) ?? null;
  const sheet = () => el().querySelector('tg-sheet dialog') as HTMLDialogElement;
  const chip = (label: string) =>
    [...sheet().querySelectorAll<HTMLButtonElement>('.search__chip')].find(
      (b) => text(b) === label || b.getAttribute('aria-label') === label,
    )!;

  afterEach(() => window.localStorage.removeItem('search.onlyFavorites.client-1'));

  it('selects the principal address and lists every saved address', () => {
    addressMock.getAllAddresses.and.returnValue(
      of([
        { id: 'work', label: 'Trabalho', lat: -22, lng: -43 },
        { id: 'home', label: 'Casa', isDefault: true, lat: -23, lng: -46 },
        { id: 'other', label: 'Outro', lat: -24, lng: -47 },
        { id: 'fourth', label: 'Quarto', lat: -25, lng: -48 },
      ]),
    );
    fixture.detectChanges();
    expect(component.selectedAddressId()).toBe('home');
    expect(component.searchOrigin()).toEqual({ lat: -23, lng: -46 });
    expect(fixture.nativeElement.querySelectorAll('#search-address option').length).toBe(5);
    const select = fixture.nativeElement.querySelector('#search-address') as HTMLSelectElement;
    select.value = 'work';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.selectedAddressId()).toBe('work');
    expect(component.searchOrigin()).toEqual({ lat: -22, lng: -43 });
    expect(providerMock.findProvidersByCategorySlug.calls.mostRecent().args[1]).toEqual(
      jasmine.objectContaining({ lat: -22, lng: -43 }),
    );
    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent)).componentInstance;
    expect(map.userLocation).toEqual({ lat: -22, lng: -43 });
  });

  it('keeps the selected address when device location fails', () => {
    fixture.detectChanges();
    const origin = component.searchOrigin();
    geolocalizationMock.getCurrentPosition.and.returnValue(throwError(() => new Error('denied')));
    component.searchNearMe();
    expect(component.searchOrigin()).toEqual(origin);
    expect(component.locationSource()).toBe('address');
    expect(component.locationLoading()).toBeFalse();
  });

  it('ignores an old device request after selecting an address', () => {
    addressMock.getAllAddresses.and.returnValue(of([{ id: 'home', lat: -23, lng: -46 }]));
    fixture.detectChanges();
    const position = new Subject<{ latitude: number; longitude: number }>();
    geolocalizationMock.getCurrentPosition.and.returnValue(position);
    component.searchNearMe();
    component.selectAddress('home');
    position.next({ latitude: -22, longitude: -43 });
    position.complete();
    expect(component.searchOrigin()).toEqual({ lat: -23, lng: -46 });
    expect(component.locationSource()).toBe('address');
  });

  it('uses a valid alternative when the principal address has no coordinates', () => {
    addressMock.getAllAddresses.and.returnValue(
      of([
        { id: 'home', isDefault: true, lat: null, lng: null },
        { id: 'work', lat: -22, lng: -43 },
      ]),
    );
    fixture.detectChanges();
    expect(component.selectedAddressId()).toBe('work');
    expect(component.addresses().length).toBe(2);
    expect(geolocalizationMock.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('opens the filters in a tg-sheet and closes when applying them', () => {
    fixture.detectChanges();
    const trigger = el().querySelector('.search__filters-button') as HTMLButtonElement;
    expect(sheet().open).toBeFalse();
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(sheet().open).toBeTrue();
    expect(sheet().querySelector('#search-address')).toBeTruthy();
    expect(sheet().querySelector('#search-rating-title')).toBeTruthy();
    expect(buttonIn(sheet(), 'Limpar')).toBeTruthy();
    buttonIn(sheet(), 'Ver profissionais')!.click();
    fixture.detectChanges();
    expect(sheet().open).toBeFalse();
    expect(document.activeElement).toBe(trigger);
  });

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
    expect(addressMock.getAllAddresses).toHaveBeenCalledWith('client-1');
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
    addressMock.getAllAddresses.and.returnValue(of([{ isDefault: true, lat: -22.9, lng: -43.2 }]));
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
    addressMock.getAllAddresses.and.returnValue(of([{ isDefault: true, lat: -23.6, lng: -46.7 }]));
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
        id: '101',
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
        priceFrom: Number.NaN,
        premium: false,
        verified: false,
      }),
    );
  });

  it('should navigate to the provider profile when the map emits viewProfile', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent))
      .componentInstance as ProxiMapStubComponent;
    map.viewProfile.emit('101');

    expect(routerMock.navigate).toHaveBeenCalledWith(['/customer', '101']);
  });

  it('should render the map host and the provider list together', () => {
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(ProxiMapStubComponent))
      .componentInstance as ProxiMapStubComponent;
    const providerCards = fixture.debugElement.queryAll(By.css('tg-provider-card'));

    expect(fixture.nativeElement.querySelector('.search__results .search__map')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.search__results .search__list')).toBeTruthy();
    expect(map.userLocation).toEqual({ lat: -23.552, lng: -46.635 });
    expect(map.providers.length).toBe(1);
    expect(providerCards.length).toBe(1);
  });

  it('should render the empty map message outside the map when no providers have valid locations', () => {
    providersResponse = [];

    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.search__map-empty');

    expect(emptyMessage?.textContent).toContain('Nenhum profissional com localização');
    expect(fixture.debugElement.query(By.directive(ProxiMapStubComponent))).toBeTruthy();
  });

  it('should load favorites for the signed-in user', () => {
    fixture.detectChanges();

    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1', { skip: 0, take: 100 });
    expect(component.isFavorite('101')).toBeTrue();
  });

  it('loads favorite ids on later pages so search hearts work beyond the first page', () => {
    providerMock.listFavorites.and.callFake((_clientId: string, paging: { skip: number }) =>
      of(
        paging.skip === 0
          ? {
              items: Array.from({ length: 100 }, (_, index) => ({
                providerId: `provider-${index}`,
              })),
              total: 101,
            }
          : { items: [{ providerId: 'provider-200' }], total: 101 },
      ),
    );
    fixture.detectChanges();
    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1', { skip: 100, take: 100 });
    expect(component.isFavorite('provider-200')).toBeTrue();
    component.retrySearch.next();
    expect(providerMock.listFavorites).toHaveBeenCalledTimes(2);
  });

  it('keeps the results and the hearts when loading favorites fails', () => {
    const unhandled = jasmine.createSpy('onUnhandledError');
    const previous = config.onUnhandledError;
    config.onUnhandledError = unhandled;
    providerMock.listFavorites.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    try {
      fixture.detectChanges();

      expect(unhandled).not.toHaveBeenCalled();
      expect(component.providers().length).toBeGreaterThan(0);
      expect(component.isFavorite('101')).toBeFalse();
    } finally {
      config.onUnhandledError = previous;
    }
  });

  it('should pass onlyFavorites when the switch is on and the filters are applied', () => {
    fixture.detectChanges();

    component.openFilters();
    component.setDraft('onlyFavorites', true);
    component.applyFilters();

    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ onlyFavorites: 'true' }),
      }),
    );
  });

  it('should persist onlyFavorites preference when the filters are applied', () => {
    spyOn(window.localStorage, 'setItem');
    fixture.detectChanges();

    component.openFilters();
    component.setDraft('onlyFavorites', true);
    component.applyFilters();

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

  it('sends rating, distance and price filters to the API and displays its filtered response', () => {
    providersResponse = [{ ...validProvider, id: 'match', distanceKm: 4 }];
    fixture.detectChanges();

    queryParams.next({
      categoria: 'encanadores',
      minimumRating: '4',
      maximumDistance: '10',
      minimumPrice: '100',
      maximumPrice: '200',
    });

    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith(
      'encanadores',
      jasmine.objectContaining({
        minimumRating: 4,
        maximumDistance: 10,
        minimumPrice: 100,
        maximumPrice: 200,
      }),
    );
    expect(component.providers().map((provider) => provider.id)).toEqual(['match']);
  });

  it('delegates favorite-only filtering to the API', () => {
    providersResponse = [validProvider, { ...validProvider, id: '102' }];
    fixture.detectChanges();
    queryParams.next({ categoria: 'encanadores', onlyFavorites: 'true' });
    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith(
      'encanadores',
      jasmine.objectContaining({ onlyFavorites: true }),
    );
    expect(component.providers().map((provider) => provider.id)).toEqual(['101', '102']);
  });

  it('should calculate provider distance from coordinates when it is not supplied', () => {
    providersResponse = [{ ...validProvider, distanceKm: undefined }];
    fixture.detectChanges();
    expect(component.providers().map((provider) => provider.id)).toEqual(['101']);
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

    component.toggleFavorite('101');

    expect(providerMock.addFavorite).toHaveBeenCalledWith('client-1', '101');
    expect(component.isFavorite('101')).toBeTrue();
    expect(component.isFavoriteLoading('101')).toBeFalse();
  });

  it('should remove a favorite when toggled off', () => {
    component.favorites.set({ '101': true });

    component.toggleFavorite('101');

    expect(providerMock.removeFavorite).toHaveBeenCalledWith('client-1', '101');
    expect(component.isFavorite('101')).toBeFalse();
    expect(component.isFavoriteLoading('101')).toBeFalse();
  });

  it('should show an error message when favorite update fails', () => {
    providerMock.addFavorite.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'fail' } })),
    );
    component.favorites.set({});

    component.toggleFavorite('101');

    expect(component.favoriteErrorMessage('101')).toBe('fail');
    expect(component.isFavorite('101')).toBeFalse();
    expect(component.isFavoriteLoading('101')).toBeFalse();
  });
  describe('filtros só valem ao aplicar', () => {
    it('mudar o rascunho não busca nem filtra; aplicar salva os parâmetros na URL', () => {
      providersResponse = [
        { ...validProvider, id: '201', distanceKm: 2 },
        {
          ...validProvider,
          id: '202',
          distanceKm: 4,
          user: { name: 'Bia', provider: { ratingAvg: 3.2 } },
        },
      ];
      fixture.detectChanges();
      component.openFilters();
      fixture.detectChanges();

      chip('4 estrelas ou mais').click();
      fixture.detectChanges();
      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(component.providers().length).toBe(2);
      expect(buttonIn(sheet(), 'Ver profissionais')).not.toBeNull();

      buttonIn(sheet(), 'Ver profissionais')!.click();
      fixture.detectChanges();
      expect(routerMock.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({ queryParams: jasmine.objectContaining({ minimumRating: 4 }) }),
      );
      expect(component.providers().map((p) => p.id)).toEqual(['201', '202']);
      expect(text(el().querySelector('.search__filters-button'))).toBe('Filtros · 1');
    });

    it('fechar sem aplicar descarta o rascunho', () => {
      fixture.detectChanges();
      component.openFilters();
      fixture.detectChanges();
      chip('Até 10 km').click();
      component.filtersSheet()!.close();
      fixture.detectChanges();
      expect(component.maximumDistance()).toBe(0);

      component.openFilters();
      fixture.detectChanges();
      expect(chip('Sem limite').getAttribute('aria-pressed')).toBe('true');
      expect(chip('Até 10 km').getAttribute('aria-pressed')).toBe('false');
    });

    it('"Limpar" zera só o rascunho', () => {
      queryParams.next({ categoria: 'encanadores', minimumRating: '4', maximumDistance: '10' });
      fixture.detectChanges();
      component.openFilters();
      fixture.detectChanges();
      buttonIn(sheet(), 'Limpar')!.click();
      fixture.detectChanges();
      expect(component.draft()).toEqual({
        minimumRating: 0,
        maximumDistance: 0,
        minimumPrice: null,
        maximumPrice: null,
        onlyFavorites: false,
      });
      expect(component.minimumRating()).toBe(4);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('preço máximo menor que o mínimo: erro no campo e ação desativada', () => {
      fixture.detectChanges();
      component.openFilters();
      fixture.detectChanges();
      const min = sheet().querySelector('#search-price-min') as HTMLInputElement;
      const max = sheet().querySelector('#search-price-max') as HTMLInputElement;
      min.value = '200';
      min.dispatchEvent(new Event('input'));
      max.value = '100';
      max.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(text(sheet())).toContain('O máximo precisa ser maior que o mínimo.');
      expect(sheet().querySelector<HTMLButtonElement>('.search__apply')!.disabled).toBeTrue();
      component.applyFilters();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  it('chips de categoria buscam na hora; "Todas" tira a categoria', () => {
    fixture.detectChanges();
    const chips = [
      ...el().querySelectorAll<HTMLButtonElement>('.search__categories .search__chip'),
    ];
    expect(chips.map((c) => text(c))).toEqual(['Todas', 'Encanadores']);
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    chips[0].click();
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: { categoria: null } }),
    );
  });

  it('lista dos mais próximos para os mais distantes; sem distância vai para o fim', () => {
    providersResponse = [
      { ...validProvider, id: '301', distanceKm: 8, lat: undefined, lng: undefined },
      { ...validProvider, id: '302', distanceKm: undefined, lat: undefined, lng: undefined },
      { ...validProvider, id: '303', distanceKm: 1.5 },
      { ...validProvider, id: '304', distanceKm: 4 },
    ];
    fixture.detectChanges();
    expect(component.providers().map((p) => p.id)).toEqual(['303', '304', '301', '302']);
    expect(text(el().querySelector('.search__count-order'))).toBe('Mais próximos primeiro');
  });

  it('card do DS com o coração no estado real do favorito', () => {
    providersResponse = [validProvider, { ...validProvider, id: '102', distanceKm: 9 }];
    fixture.detectChanges();
    const hearts = [...el().querySelectorAll('.tg-provider-card__favorite')];
    expect(hearts.map((h) => h.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(el().querySelector('tg-provider-card a')?.getAttribute('href')).toBe('/customer/101');
  });

  it('carregando: skeleton enquanto a busca não volta', () => {
    const response = new Subject<unknown[]>();
    providerMock.findProvidersByCategorySlug.and.returnValue(response);
    fixture.detectChanges();
    expect(component.searching()).toBeTrue();
    expect(el().querySelector('tg-provider-card')).toBeNull();
    expect(text(el().querySelector('.search__count-title'))).toBe('Buscando profissionais');
    response.next([validProvider]);
    fixture.detectChanges();
    expect(component.searching()).toBeFalse();
    expect(el().querySelectorAll('tg-provider-card').length).toBe(1);
  });

  it('sem resultado: estado vazio com "Limpar filtros"', () => {
    providersResponse = [];
    fixture.detectChanges();
    const empty = el().querySelector('tg-empty-state')!;
    expect(text(empty)).toContain('Ninguém com esses filtros');
    buttonIn(empty, 'Limpar filtros')!.click();
    expect(routerMock.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({ queryParams: jasmine.objectContaining({ categoria: null }) }),
    );
  });

  it('falha na busca: alerta com "Tentar de novo"', () => {
    providerMock.findProvidersByCategorySlug.and.returnValue(
      throwError(() => new Error('offline')),
    );
    fixture.detectChanges();
    expect(text(el().querySelector('tg-alert'))).toContain(
      'Não foi possível buscar os profissionais',
    );
    providerMock.findProvidersByCategorySlug.and.returnValue(of([validProvider]));
    buttonIn(el(), 'Tentar de novo')!.click();
    fixture.detectChanges();
    expect(el().querySelectorAll('tg-provider-card').length).toBe(1);
  });

  describe('filtros de preço enviados à API', () => {
    it('envia a faixa de preço ao aplicar e não filtra localmente o rascunho', () => {
      providersResponse = [
        {
          ...validProvider,
          id: '409',
          services: [{ id: 'a', title: 'A', category: 'encanadores', basePrice: 300 }],
        },
        {
          ...validProvider,
          id: '410',
          services: [{ id: 'b', title: 'B', category: 'encanadores', basePrice: 250 }],
        },
        {
          ...validProvider,
          id: '411',
          services: [{ id: 'c', title: 'C', category: 'encanadores', basePrice: 140 }],
        },
      ];
      fixture.detectChanges();
      component.openFilters();
      component.setDraft('minimumPrice', 120);
      component.setDraft('maximumPrice', 200);

      expect(component.providers().length).toBe(3);
      expect(component.applyLabel()).toBe('Ver profissionais');
      component.applyFilters();
      expect(routerMock.navigate).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          queryParams: jasmine.objectContaining({ minimumPrice: 120, maximumPrice: 200 }),
        }),
      );
      // A filtragem é responsabilidade da API; o cliente mantém a resposta recebida.
      expect(component.providers().length).toBe(3);
    });

    it('usa o mesmo menor preço elegível do card e do mapa', () => {
      providersResponse = [
        {
          ...validProvider,
          id: '412',
          services: [
            {
              id: 'a',
              title: 'Mais caro',
              category: 'encanadores',
              basePrice: 300,
              status: 'ATIVO',
            },
            {
              id: 'b',
              title: 'Mais barato',
              category: 'encanadores',
              basePrice: 100,
              status: 'ATIVO',
            },
          ],
        },
      ];
      fixture.detectChanges();
      expect(component.cards()[0].priceFrom).toBe(100);
      expect(component.mapProviders()[0].priceFrom).toBe(100);
    });
  });

  describe('favoritos fora de ordem', () => {
    const later = <T>() => new Subject<T>();
    type List = { items: { providerId: string }[] };

    it('lista antiga que chega depois de favoritar não desfaz o favorito', () => {
      providersResponse = [{ ...validProvider, id: '102' }];
      const list = later<List>();
      providerMock.listFavorites.and.returnValue(list);
      fixture.detectChanges();
      component.toggleFavorite('102');
      expect(component.isFavorite('102')).toBeTrue();
      list.next({ items: [] });
      expect(component.isFavorite('102')).toBeTrue();
    });

    it('lista antiga que chega depois de desfavoritar não volta o favorito', () => {
      const first = later<List>();
      providerMock.listFavorites.and.returnValue(of({ items: [{ providerId: '101' }] }));
      fixture.detectChanges();
      expect(component.isFavorite('101')).toBeTrue();
      providerMock.listFavorites.and.returnValue(first);
      component.retrySearch.next();
      component.toggleFavorite('101');
      expect(component.isFavorite('101')).toBeFalse();
      first.next({ items: [{ providerId: '101' }] });
      expect(component.isFavorite('101')).toBeFalse();
    });

    it('carrega favoritos uma vez e não repete a consulta ao tentar novamente a busca', () => {
      const list = later<List>();
      providerMock.listFavorites.and.returnValue(list);
      fixture.detectChanges();
      component.retrySearch.next();
      expect(providerMock.listFavorites).toHaveBeenCalledTimes(1);
      list.next({ items: [{ providerId: '101' }] });
      expect(component.isFavorite('101')).toBeTrue();
    });

    it('as alterações do usuário permanecem após tentar novamente a busca', () => {
      fixture.detectChanges();
      component.toggleFavorite('101');
      expect(component.isFavorite('101')).toBeFalse();
      component.retrySearch.next();
      expect(providerMock.listFavorites).toHaveBeenCalledTimes(1);
      expect(component.isFavorite('101')).toBeFalse();
    });

    it('falha ao favoritar: estado e carregamento coerentes, e a lista seguinte vale', () => {
      const list = later<List>();
      providerMock.listFavorites.and.returnValue(list);
      providerMock.addFavorite.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      fixture.detectChanges();
      component.toggleFavorite('101');
      expect(component.isFavorite('101')).toBeFalse();
      expect(component.isFavoriteLoading('101')).toBeFalse();
      expect(component.favoriteErrorMessage('101')).toBe('Erro ao atualizar favorito.');
      list.next({ items: [{ providerId: '101' }] });
      expect(component.isFavorite('101')).toBeTrue();
    });

    it('"Somente favoritos" continua certo depois de desfavoritar e de uma lista antiga', () => {
      providersResponse = [validProvider, { ...validProvider, id: '102' }];
      fixture.detectChanges();
      component.openFilters();
      component.setDraft('onlyFavorites', true);
      component.applyFilters();
      expect(component.providers().map((p) => p.id)).toEqual(['101']);
      const old = later<List>();
      providerMock.listFavorites.and.returnValue(old);
      component.retrySearch.next();
      component.toggleFavorite('101');
      expect(component.providers()).toEqual([]);
      old.next({ items: [{ providerId: '101' }] });
      expect(component.providers()).toEqual([]);
    });

    it('lista de outro usuário (troca de sessão) não vale', () => {
      const list = later<List>();
      providerMock.listFavorites.and.returnValue(list);
      fixture.detectChanges();
      userLoggedMock.user.and.returnValue({ user: { id: 'client-2' } });
      list.next({ items: [{ providerId: '101' }] });
      expect(component.isFavorite('101')).toBeFalse();
    });

    it('destruir a tela cancela as consultas e trocas pendentes', () => {
      const list = later<List>();
      const add = later<null>();
      providerMock.listFavorites.and.returnValue(list);
      providerMock.addFavorite.and.returnValue(add);
      fixture.detectChanges();
      component.toggleFavorite('101');
      fixture.destroy();
      expect(list.observed).toBeFalse();
      expect(add.observed).toBeFalse();
    });
  });

  describe('celular', () => {
    beforeEach(() => component.wide.set(false));

    it('abas "Lista" e "Mapa": a lista abre primeiro e o mapa só nasce na aba dele', () => {
      fixture.detectChanges();
      const tabs = [...el().querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      expect(tabs.map((t) => text(t))).toEqual(['Lista', 'Mapa']);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(el().querySelectorAll('tg-provider-card').length).toBe(1);
      expect(fixture.debugElement.query(By.directive(ProxiMapStubComponent))).toBeNull();

      tabs[1].click();
      fixture.detectChanges();
      expect(component.resultsView()).toBe('map');
      expect(fixture.debugElement.query(By.directive(ProxiMapStubComponent))).not.toBeNull();
    });
  });
});
