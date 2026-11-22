import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IFullAddress } from '@shared/service/address/address.model';
import { Address } from '@shared/service/address/address';
import {
  ProxiMapComponent,
  ProxiMapLocation,
  ProxiMapProvider,
} from '@shared/components/ui/proxi-map/proxi-map.component';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { Provider } from '@shared/service/provider/provider';
import type { FavoriteItem } from '@shared/service/provider/provider.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { environment } from '@environments/environment';
import {
  catchError,
  combineLatest,
  finalize,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { ICategory } from '@shared/service/category/category.model';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgSheetComponent } from '@shared/design-system/dialog/tg-sheet.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgProviderCardComponent } from '@shared/design-system/provider-card/tg-provider-card.component';
import {
  TgProvider,
  tgProviderPriceFrom,
  toTgProvider,
} from '@shared/design-system/provider-card/tg-provider';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TgTabComponent, TgTabsComponent } from '@shared/design-system/tabs/tg-tabs.component';

/** Filtros que valem só ao aplicar no painel (a categoria fica fora: busca na hora). */
export interface SearchFilters {
  minimumRating: number;
  maximumDistance: number;
  minimumPrice: number | null;
  maximumPrice: number | null;
  onlyFavorites: boolean;
}

/** Opções fixas dos chips do painel (0 = sem filtro). */
export const SEARCH_RATINGS = [0, 3, 4, 4.5] as const;
export const SEARCH_DISTANCES = [0, 5, 10, 25] as const;
/** A partir desta largura, lista e mapa lado a lado; abaixo, abas "Lista" e "Mapa". */
export const SEARCH_WIDE_MEDIA = '(min-width: 960px)';

const RATING = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/**
 * Busca de profissionais (Etapa 10), só para o cliente. Chips de categoria
 * buscam na hora; nota, distância, preço e favoritos ficam num `tg-sheet` e só
 * valem ao tocar "Ver profissionais". A API filtra e ordena os resultados.
 * Na tela grande, lista e mapa lado a lado; no celular, abas.
 */
@Component({
  selector: 'app-search',
  imports: [
    ProxiMapComponent,
    FormsModule,
    NgTemplateOutlet,
    TgAlertComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgProviderCardComponent,
    TgSheetComponent,
    TgSkeletonComponent,
    TgTabComponent,
    TgTabsComponent,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search implements OnInit {
  #userLoggedService = inject(UserLoggedService);
  #geolocalization = inject(Geolocalization);
  #route = inject(ActivatedRoute);
  #provider = inject(Provider);
  #address = inject(Address);
  #categoryService = inject(CategoryService);
  #router = inject(Router);
  #destroyRef = inject(DestroyRef);
  /**
   * Ordem dos eventos de favoritos: cada consulta da lista e cada troca
   * concluída recebem um número. Uma lista vale só se for a mais nova que já
   * chegou, e não desfaz uma troca concluída depois de ela ter sido pedida.
   */
  #favoritesSeq = 0;
  #favoritesAppliedSeq = 0;
  /** Troca concluída mais recente de cada prestador (número da ordem acima). */
  #favoriteEdits = new Map<string, number>();

  readonly ratings = SEARCH_RATINGS;
  readonly distances = SEARCH_DISTANCES;
  readonly filtersSheet = viewChild<TgSheetComponent>('filtersSheet');
  /** Lista e mapa lado a lado (tela grande) ou em abas (celular). */
  readonly wide = signal(false);
  /** Aba aberta no celular. */
  readonly resultsView = signal<'list' | 'map'>('list');
  /** Busca em curso. */
  readonly searching = signal(true);
  /** Rascunho do painel de filtros; só vale ao aplicar. */
  readonly draft = signal<SearchFilters>({
    minimumRating: 0,
    maximumDistance: 0,
    minimumPrice: null,
    maximumPrice: null,
    onlyFavorites: false,
  });

  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favoriteLoading = signal<Record<string, boolean>>({});
  searchError = signal('');
  readonly retrySearch = new Subject<void>();
  addresses = signal<IFullAddress[]>([]);
  selectedAddressId = signal('');
  addressesLoading = signal(false);
  addressError = signal('');
  private locationRequestId = 0;
  locationLoading = signal(false);
  locationError = signal('');
  locationSource = signal<'address' | 'browser' | null>(null);
  userLocationLabel = computed(() =>
    this.locationSource() === 'address'
      ? this.addresses().find((address) => String(address.id) === this.selectedAddressId())
          ?.label || 'Endereço cadastrado'
      : 'Sua localização atual',
  );
  userLocation = signal<ProxiMapLocation | null>(null);
  searchRegion = signal<ProxiMapLocation | null>(null);
  searchOrigin = computed(() => this.searchRegion() ?? this.userLocation());
  favoriteError = signal<Record<string, string>>({});
  favorites = signal<Record<string, boolean>>({});
  onlyFavorites = signal(false);
  allProviders = signal<any[]>([]);
  categories = signal<ICategory[]>([]);
  category = signal('');
  minimumRating = signal(0);
  maximumDistance = signal(0);
  minimumPrice = signal<number | null>(null);
  maximumPrice = signal<number | null>(null);

  readonly filters = computed<SearchFilters>(() => ({
    minimumRating: this.minimumRating(),
    maximumDistance: this.maximumDistance(),
    minimumPrice: this.minimumPrice(),
    maximumPrice: this.maximumPrice(),
    onlyFavorites: this.onlyFavorites(),
  }));

  /** A API já retorna os prestadores filtrados e ordenados por distância. */
  providers = computed(() => this.allProviders());
  readonly draftPriceError = computed(() => {
    const { minimumPrice, maximumPrice } = this.draft();
    return minimumPrice != null && maximumPrice != null && maximumPrice < minimumPrice
      ? 'O máximo precisa ser maior que o mínimo.'
      : '';
  });
  readonly applyLabel = computed(() => 'Ver profissionais');
  /** Filtros do painel em uso (para o "Filtros · N"). */
  readonly activeFilters = computed(() => {
    const f = this.filters();
    return [
      f.minimumRating > 0,
      f.maximumDistance > 0,
      f.minimumPrice != null,
      f.maximumPrice != null,
      f.onlyFavorites,
    ].filter(Boolean).length;
  });
  readonly filtersLabel = computed(() =>
    this.activeFilters() ? `Filtros · ${this.activeFilters()}` : 'Filtros',
  );
  readonly resultsLabel = computed(() => {
    const count = this.providers().length;
    return count === 1 ? '1 profissional' : `${count} profissionais`;
  });
  /** Cards da lista: só prestadores com id válido (sem id não há perfil para abrir). */
  readonly cards = computed(() =>
    this.providers()
      .map((provider) => this.toCard(provider))
      .filter((card): card is TgProvider => card !== null),
  );
  /** Primeira falha ao favoritar, para o aviso acima da lista. */
  readonly favoriteFailure = computed(
    () => Object.values(this.favoriteError()).find(Boolean) ?? '',
  );

  mapProviders = computed(() =>
    this.providers()
      .map((provider: any) => this.toMapProvider(provider))
      .filter((provider: ProxiMapProvider | null): provider is ProxiMapProvider => !!provider),
  );

  private get storageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const query =
      typeof view?.matchMedia === 'function' ? view.matchMedia(SEARCH_WIDE_MEDIA) : null;
    if (!query) return;
    this.wide.set(query.matches);
    const update = (event: MediaQueryListEvent) => this.wide.set(event.matches);
    query.addEventListener('change', update);
    this.#destroyRef.onDestroy(() => query.removeEventListener('change', update));
  }

  ngOnInit(): void {
    this.resolveUserLocation();
    this.loadCategories();
    const clientId = this.#userLoggedService.user()?.user?.id;
    if (this.favoritesEnabled && clientId) this.loadFavorites(String(clientId));

    combineLatest([this.#route.queryParams, this.retrySearch.pipe(startWith(undefined))])
      .pipe(
        map(([params]) => params),
        tap(
          ({
            categoria,
            lat,
            lng,
            onlyFavorites,
            minimumRating,
            maximumDistance,
            minimumPrice,
            maximumPrice,
          }) => {
            this.searchRegion.set(this.toLocation({ lat, lng }));
            this.category.set(categoria ?? '');
            this.minimumRating.set(this.queryNumber(minimumRating));
            this.maximumDistance.set(this.queryNumber(maximumDistance));
            this.minimumPrice.set(this.queryOptionalNumber(minimumPrice));
            this.maximumPrice.set(this.queryOptionalNumber(maximumPrice));

            const clientId = this.#userLoggedService.user()?.user?.id;
            const persistedOnlyFavorites = clientId
              ? this.restoreOnlyFavoritesPreference(String(clientId))
              : false;
            const queryOnlyFavorites = onlyFavorites === 'true';
            const nextOnlyFavorites =
              onlyFavorites !== undefined ? queryOnlyFavorites : persistedOnlyFavorites;

            this.onlyFavorites.set(nextOnlyFavorites);

            if (clientId && onlyFavorites !== undefined) {
              this.persistOnlyFavoritesPreference(String(clientId), nextOnlyFavorites);
            }
          },
        ),
        switchMap(({ categoria, onlyFavorites }) => {
          this.searchError.set('');
          this.searching.set(true);
          return this.#provider
            .findProvidersByCategorySlug(categoria, {
              ...this.searchOrigin(),
              onlyFavorites:
                onlyFavorites === 'true' || (onlyFavorites === undefined && this.onlyFavorites()),
              minimumRating: this.minimumRating(),
              maximumDistance: this.maximumDistance(),
              minimumPrice: this.minimumPrice(),
              maximumPrice: this.maximumPrice(),
            })
            .pipe(
              catchError(() => {
                this.searchError.set('Não foi possível buscar os profissionais. Tente novamente.');
                return of([]);
              }),
            );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (params: any) => {
          this.searching.set(false);
          this.allProviders.set(params);
        },
      });
  }

  updateCategory(category: string) {
    this.updateFilters({ categoria: this.category() === category ? null : category });
  }

  /** Abre o painel com o rascunho igual aos filtros em uso. */
  openFilters() {
    this.draft.set({ ...this.filters() });
    this.filtersSheet()?.open();
  }

  setDraft<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  setDraftPrice(key: 'minimumPrice' | 'maximumPrice', event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    this.setDraft(key, raw === '' ? null : this.normalizePrice(Number(raw)));
  }

  setDraftFavorites(event: Event) {
    this.setDraft('onlyFavorites', (event.target as HTMLInputElement).checked);
  }

  /** "Limpar" do painel: zera o rascunho; só vale ao aplicar. */
  clearDraft() {
    this.draft.set({
      minimumRating: 0,
      maximumDistance: 0,
      minimumPrice: null,
      maximumPrice: null,
      onlyFavorites: false,
    });
  }

  ratingLabel(value: number) {
    return value ? `${RATING.format(value)}+` : 'Qualquer';
  }

  ratingName(value: number) {
    return value ? `${RATING.format(value)} estrelas ou mais` : 'Qualquer avaliação';
  }

  distanceLabel(value: number) {
    return value ? `Até ${value} km` : 'Sem limite';
  }

  /** Aplica o rascunho na URL e guarda a preferência de favoritos. */
  applyFilters() {
    if (this.draftPriceError()) return;
    const draft = this.draft();
    this.minimumRating.set(draft.minimumRating);
    this.maximumDistance.set(draft.maximumDistance);
    this.minimumPrice.set(draft.minimumPrice);
    this.maximumPrice.set(draft.maximumPrice);
    this.onlyFavorites.set(draft.onlyFavorites);
    const clientId = this.#userLoggedService.user()?.user?.id;
    if (clientId) this.persistOnlyFavoritesPreference(String(clientId), draft.onlyFavorites);
    this.updateFilters({
      minimumRating: draft.minimumRating || null,
      maximumDistance: draft.maximumDistance || null,
      minimumPrice: draft.minimumPrice,
      maximumPrice: draft.maximumPrice,
      onlyFavorites: draft.onlyFavorites ? 'true' : null,
    });
  }

  clearFilters() {
    this.category.set('');
    const clientId = this.#userLoggedService.user()?.user?.id;
    if (clientId) this.persistOnlyFavoritesPreference(String(clientId), false);
    this.minimumRating.set(0);
    this.maximumDistance.set(0);
    this.minimumPrice.set(null);
    this.maximumPrice.set(null);
    this.onlyFavorites.set(false);
    this.updateFilters({
      categoria: null,
      minimumRating: null,
      maximumDistance: null,
      minimumPrice: null,
      maximumPrice: null,
      onlyFavorites: null,
    });
  }

  private updateFilters(queryParams: Record<string, unknown>) {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private loadCategories() {
    this.#categoryService.getCategories().subscribe({
      next: (response) => this.categories.set(response.data ?? []),
    });
  }

  /** Prestador que o card mostra; a distância é a da busca (a da API ou a calculada). */
  private toCard(provider: unknown): TgProvider | null {
    const card = toTgProvider(provider, { category: this.category() || null });
    return card ? { ...card, distanceKm: this.providerDistance(provider) } : null;
  }

  viewProviderProfile(providerId: ProxiMapProvider['id']) {
    this.#router.navigate(['/customer', providerId]);
  }

  private restoreOnlyFavoritesPreference(clientId: string) {
    if (!this.storageAvailable) {
      return false;
    }

    return window.localStorage.getItem(this.getStorageKey(clientId)) === 'true';
  }

  private persistOnlyFavoritesPreference(clientId: string, value: boolean) {
    if (!this.storageAvailable) {
      return;
    }

    window.localStorage.setItem(this.getStorageKey(clientId), value ? 'true' : 'false');
  }

  private getStorageKey(clientId: string) {
    return `search.onlyFavorites.${clientId}`;
  }

  private resolveUserLocation() {
    const userId = this.#userLoggedService.user()?.user?.id;
    if (!userId) {
      this.requestCurrentLocation();
      return;
    }

    this.addressesLoading.set(true);
    this.#address.getAllAddresses(String(userId)).subscribe({
      next: (data) => {
        const active = data.filter((address) => address.active !== false);
        this.addresses.set(active);
        this.addressesLoading.set(false);
        const preferred =
          active.find((address) => address.isDefault && this.toLocation(address)) ??
          active.find((address) => this.toLocation(address));
        if (preferred) {
          this.selectedAddressId.set(String(preferred.id));
          this.userLocation.set(this.toLocation(preferred));
          this.locationSource.set('address');
          this.retrySearch.next();
        } else {
          this.requestCurrentLocation();
        }
      },
      error: () => {
        this.addressesLoading.set(false);
        this.addressError.set('Não foi possível carregar seus endereços.');
        this.requestCurrentLocation();
      },
    });
  }

  addressLabel(address: IFullAddress) {
    return [
      address.label,
      [address.street, address.number].filter(Boolean).join(', '),
      [address.city, address.state].filter(Boolean).join(' / '),
    ]
      .filter(Boolean)
      .join(' — ');
  }

  addressHasLocation(address: IFullAddress) {
    return this.toLocation(address) !== null;
  }

  selectAddress(id: string) {
    const address = this.addresses().find((item) => String(item.id) === id);
    const location = this.toLocation(address);
    if (!location) return;
    ++this.locationRequestId;
    this.locationLoading.set(false);
    this.locationError.set('');
    this.selectedAddressId.set(id);
    this.userLocation.set(location);
    this.locationSource.set('address');
    if (this.searchRegion()) this.updateFilters({ lat: null, lng: null });
    else this.retrySearch.next();
  }

  requestCurrentLocation(useForSearch = false) {
    const requestId = ++this.locationRequestId;
    this.locationLoading.set(true);
    this.locationError.set('');
    this.#geolocalization
      .getCurrentPosition()
      .pipe(
        finalize(() => {
          if (requestId === this.locationRequestId) this.locationLoading.set(false);
        }),
      )
      .subscribe({
        next: ({ latitude, longitude }) => {
          if (requestId !== this.locationRequestId) return;
          const location = this.toLocation({ latitude, longitude });
          if (!location) {
            this.locationError.set(
              'O aparelho não retornou uma localização válida. Tente novamente.',
            );
            return;
          }
          this.selectedAddressId.set('');
          this.userLocation.set(location);
          this.locationSource.set(location ? 'browser' : null);
          if (location) {
            if (useForSearch && this.searchRegion()) this.updateFilters({ lat: null, lng: null });
            else this.retrySearch.next();
          }
        },
        error: () => {
          if (requestId !== this.locationRequestId) return;
          this.locationError.set(
            'Não foi possível obter sua localização. Permita o acesso no navegador ou cadastre um endereço no perfil.',
          );
        },
      });
  }

  searchNearMe() {
    this.requestCurrentLocation(true);
  }

  private toMapProvider(provider: any): ProxiMapProvider | null {
    const locations =
      provider?.locations ?? (provider?.user?.address ? [provider.user.address] : []);
    const location =
      this.toLocation(provider) ??
      this.toLocation(locations[0]) ??
      this.toLocation(provider?.user?.address);
    const id = provider?.id ?? provider?.providerId ?? provider?.user?.id;
    if (!location || id == null || id === '') {
      return null;
    }

    return {
      id,
      name: provider?.user?.name ?? provider?.name ?? 'Profissional Proxi',
      service: this.resolveProviderService(provider),
      rating: this.providerRating(provider),
      // Sem preço válido, o mapa mostra "Preço sob consulta" (como o card).
      priceFrom: this.providerPrice(provider) ?? Number.NaN,
      lat: location.lat,
      lng: location.lng,
      distanceKm: this.providerDistance(provider) ?? undefined,
      photoUrl: provider?.user?.photoUrl ?? provider?.photoUrl,
      premium: !!(provider?.premium ?? provider?.isPremium),
      verified: !!(provider?.verified ?? provider?.user?.provider?.verified),
    };
  }

  private toLocation(source: any): ProxiMapLocation | null {
    const lat = Number(source?.lat ?? source?.latitude);
    const lng = Number(source?.lng ?? source?.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      (lat === 0 && lng === 0)
    ) {
      return null;
    }

    return { lat, lng };
  }

  private resolveProviderService(provider: any) {
    const service =
      provider?.service ??
      provider?.serviceName ??
      provider?.category?.name ??
      provider?.services?.[0]?.name ??
      this.category();

    return service || 'Serviço Proxi';
  }

  private toNumber(value: any, fallback: number) {
    if (value && Array.isArray(value.d)) {
      return Number(value.d.join('')) || fallback;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private optionalNumber(value: any) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private providerRating(provider: any) {
    return this.toNumber(
      provider?.rating ?? provider?.ratingAvg ?? provider?.user?.provider?.ratingAvg,
      0,
    );
  }

  /** O mesmo preço que o card mostra: o serviço elegível mais barato da categoria. */
  private providerPrice(provider: unknown): number | null {
    return tgProviderPriceFrom(provider, { category: this.category() || null });
  }

  private providerDistance(provider: any): number | null {
    const suppliedDistance = this.optionalNumber(provider?.distanceKm ?? provider?.distance);
    if (suppliedDistance != null) {
      return suppliedDistance;
    }

    const origin = this.searchOrigin();
    const destination =
      this.toLocation(provider) ??
      this.toLocation(provider?.locations?.[0]) ??
      this.toLocation(provider?.user?.address);
    if (!origin || !destination) {
      return null;
    }

    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(destination.lat - origin.lat);
    const longitudeDelta = radians(destination.lng - origin.lng);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(origin.lat)) *
        Math.cos(radians(destination.lat)) *
        Math.sin(longitudeDelta / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private queryNumber(value: unknown) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  private queryOptionalNumber(value: unknown) {
    if (value == null || value === '') {
      return null;
    }
    return this.normalizePrice(Number(value));
  }

  private normalizePrice(value: number | null) {
    return value != null && Number.isFinite(Number(value)) && Number(value) >= 0
      ? Number(value)
      : null;
  }

  isFavorite(providerId: any) {
    return !!this.favorites()[String(providerId)];
  }

  isFavoriteLoading(providerId: any) {
    return !!this.favoriteLoading()[String(providerId)];
  }

  favoriteErrorMessage(providerId: any) {
    return this.favoriteError()[String(providerId)] ?? '';
  }

  toggleFavorite(providerId: any) {
    if (!this.favoritesEnabled || this.isFavoriteLoading(providerId)) {
      return;
    }

    const clientId = this.#userLoggedService.user()?.user?.id;
    if (!clientId || !providerId) {
      this.favoriteError.update((state) => ({
        ...state,
        [String(providerId)]: 'Não é possível atualizar favoritos no momento.',
      }));
      return;
    }

    const providerKey = String(providerId);
    const currentlyFavorite = this.isFavorite(providerId);
    const nextState = !currentlyFavorite;

    this.favoriteLoading.update((state) => ({
      ...state,
      [providerKey]: true,
    }));
    this.favoriteError.update((state) => ({
      ...state,
      [providerKey]: '',
    }));

    const request = nextState
      ? this.#provider.addFavorite(String(clientId), providerKey)
      : this.#provider.removeFavorite(String(clientId), providerKey);

    request
      .pipe(
        finalize(() => {
          this.favoriteLoading.update((state) => ({
            ...state,
            [providerKey]: false,
          }));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          if (!this.#sameClient(clientId)) return;
          this.#favoriteEdits.set(providerKey, ++this.#favoritesSeq);
          this.favorites.update((state) => ({
            ...state,
            [providerKey]: nextState,
          }));
        },
        error: (error: HttpErrorResponse) => {
          this.favoriteError.update((state) => ({
            ...state,
            [providerKey]: error.error?.message || 'Erro ao atualizar favorito.',
          }));
        },
      });
  }

  private loadFavorites(clientId: string) {
    const seq = ++this.#favoritesSeq;
    const allFavorites: FavoriteItem[] = [];
    const loadPage = (skip: number): void => {
      this.#provider
        .listFavorites(clientId, { skip, take: FAVORITES_PAGE_SIZE })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => {
            if (!this.#sameClient(clientId) || seq < this.#favoritesAppliedSeq) return;
            allFavorites.push(...response.items);
            if (response.items.length && skip + response.items.length < response.total) {
              loadPage(skip + response.items.length);
              return;
            }

            this.#favoritesAppliedSeq = seq;
            const favoritesMap = allFavorites.reduce(
              (acc, item) => {
                const id = String(item.providerId ?? item.id ?? '');
                if (id) acc[id] = true;
                return acc;
              },
              {} as Record<string, boolean>,
            );

            // Trocas concluídas depois do pedido da primeira página ganham da lista.
            for (const [id, editSeq] of this.#favoriteEdits) {
              if (editSeq > seq) favoritesMap[id] = !!this.favorites()[id];
            }
            this.favorites.set(favoritesMap);
          },
          // Sem a lista completa, a busca segue com os corações atuais nesta visita.
          error: () => undefined,
        });
    };
    loadPage(0);
  }

  #sameClient(clientId: string | number) {
    return String(this.#userLoggedService.user()?.user?.id ?? '') === String(clientId);
  }
}

const FAVORITES_PAGE_SIZE = 100;
