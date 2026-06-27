import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { CardDetail } from '@shared/components/ui/card-detail/card-detail';
import {
  ProxiMapComponent,
  ProxiMapLocation,
  ProxiMapProvider,
} from '@shared/components/ui/proxi-map/proxi-map.component';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { environment } from '@environments/environment';
import { switchMap, tap } from 'rxjs';
import { CardProvider } from '@shared/components/ui/card-provider/card-provider';
import { FormatedProviderParamPipe } from './pipes/formated-provider-param-pipe';
import { CategoryService } from '@shared/service/category/category';
import { ICategory } from '@shared/service/category/category.model';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-search',
  imports: [
    CardProvider, 
    ProxiMapComponent, 
    FormatedProviderParamPipe, 
    FormsModule,
    ButtonComponent
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  #userLoggedService = inject(UserLoggedService);
  #geolocalization = inject(Geolocalization);
  #route = inject(ActivatedRoute);
  #provider = inject(Provider);
  #categoryService = inject(CategoryService);
  #router = inject(Router);

  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favoriteLoading = signal<Record<string, boolean>>({});
  userLocation = signal<ProxiMapLocation | null>(null);
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

  providers = computed(() => this.allProviders().filter((provider) => {
    const rating = this.providerRating(provider);
    const price = this.providerPrice(provider);
    const distance = this.providerDistance(provider);

    return rating >= this.minimumRating()
      && (!this.maximumDistance() || (distance != null && distance <= this.maximumDistance()))
      && (this.minimumPrice() == null || price >= this.minimumPrice()!)
      && (this.maximumPrice() == null || price <= this.maximumPrice()!)
      && (!this.onlyFavorites() || this.isFavorite(provider?.id ?? provider?.providerId));
  }));

  mapProviders = computed(() => this.providers()
    .map((provider: any) => this.toMapProvider(provider))
    .filter((provider: ProxiMapProvider | null): provider is ProxiMapProvider => !!provider));

  private get storageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  ngOnInit(): void {
    this.resolveUserLocation();
    this.loadCategories();

    this.#route.queryParams.pipe(
      tap(({ categoria, onlyFavorites, minimumRating, maximumDistance, minimumPrice, maximumPrice }) => {
        this.category.set(categoria ?? '');
        this.minimumRating.set(this.queryNumber(minimumRating));
        this.maximumDistance.set(this.queryNumber(maximumDistance));
        this.minimumPrice.set(this.queryOptionalNumber(minimumPrice));
        this.maximumPrice.set(this.queryOptionalNumber(maximumPrice));

        const clientId = this.#userLoggedService.user().user?.id;
        const persistedOnlyFavorites = clientId ? this.restoreOnlyFavoritesPreference(String(clientId)) : false;
        const queryOnlyFavorites = onlyFavorites === 'true';
        const nextOnlyFavorites = onlyFavorites !== undefined ? queryOnlyFavorites : persistedOnlyFavorites;

        this.onlyFavorites.set(nextOnlyFavorites);

        if (clientId && onlyFavorites !== undefined) {
          this.persistOnlyFavoritesPreference(String(clientId), nextOnlyFavorites);
        }
      }),
      switchMap(({ categoria, onlyFavorites }) =>
        this.#provider.findProvidersByCategorySlug(categoria, {
          onlyFavorites: onlyFavorites === 'true' || (onlyFavorites === undefined && this.onlyFavorites())
        })
      )
    ).subscribe({
      next: (params: any) => {
        this.allProviders.set(params);

        const clientId = this.#userLoggedService.user().user?.id;
        if (this.favoritesEnabled && clientId) {
          this.loadFavorites(String(clientId));
        }
      }
    });
  }

  updateCategory(category: string) {
    this.updateFilters({ categoria: category });
  }

  updateMinimumRating(value: number) {
    this.minimumRating.set(Number(value));
    this.updateFilters({ minimumRating: value || null });
  }

  updateMaximumDistance(value: number) {
    this.maximumDistance.set(Number(value));
    this.updateFilters({ maximumDistance: value || null });
  }

  updateMinimumPrice(value: number | null) {
    this.minimumPrice.set(this.normalizePrice(value));
    this.updateFilters({ minimumPrice: this.minimumPrice() });
  }

  updateMaximumPrice(value: number | null) {
    this.maximumPrice.set(this.normalizePrice(value));
    this.updateFilters({ maximumPrice: this.maximumPrice() });
  }

  applyFilters() {
    this.updateFilters({
      minimumRating: this.minimumRating() || null,
      maximumDistance: this.maximumDistance() || null,
      minimumPrice: this.minimumPrice(),
      maximumPrice: this.maximumPrice(),
      onlyFavorites: this.onlyFavorites() ? 'true' : null,
    });
  }

  clearFilters() {
    this.minimumRating.set(0);
    this.maximumDistance.set(0);
    this.minimumPrice.set(null);
    this.maximumPrice.set(null);
    this.onlyFavorites.set(false);
    this.updateFilters({
      minimumRating: null,
      maximumDistance: null,
      minimumPrice: null,
      maximumPrice: null,
      onlyFavorites: null,
    });
  }

  toggleOnlyFavorites(value: boolean) {
    this.onlyFavorites.set(value);

    const clientId = this.#userLoggedService.user().user?.id;
    if (clientId) {
      this.persistOnlyFavoritesPreference(String(clientId), value);
    }

    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        categoria: this.category(),
        onlyFavorites: value ? 'true' : null
      },
      queryParamsHandling: 'merge'
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
    const addressLocation = this.getUserAddressLocation();
    if (addressLocation) {
      this.userLocation.set(addressLocation);
      return;
    }

    this.#geolocalization.getCurrentPosition().subscribe({
      next: ({ latitude, longitude }) => {
        this.userLocation.set({ lat: latitude, lng: longitude });
      },
      error: () => {
        this.userLocation.set(null);
      }
    });
  }

  private getUserAddressLocation(): ProxiMapLocation | null {
    const addresses = this.#userLoggedService.user().user?.addresses ?? [];
    const address = addresses.find((item: any) => item?.isDefault || item?.isPrimary) ?? addresses[0];

    return this.toLocation(address);
  }

  private toMapProvider(provider: any): ProxiMapProvider | null {
    const locations = provider?.locations ?? (provider?.user?.address ? [provider.user.address] : []);
    const location = this.toLocation(provider) ?? this.toLocation(locations[0]) ?? this.toLocation(provider?.user?.address);
    const id = provider?.id ?? provider?.providerId ?? provider?.user?.id;
    if (!location || id == null || id === '') {
      return null;
    }

    return {
      id,
      name: provider?.user?.name ?? provider?.name ?? 'Profissional Proxi',
      service: this.resolveProviderService(provider),
      rating: this.providerRating(provider),
      priceFrom: this.providerPrice(provider),
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
    return this.toNumber(provider?.rating ?? provider?.ratingAvg ?? provider?.user?.provider?.ratingAvg, 0);
  }

  private providerPrice(provider: any) {
    return this.toNumber(
      provider?.priceFrom ?? provider?.price ?? provider?.services?.[0]?.basePrice ?? provider?.services?.[0]?.price,
      0,
    );
  }

  private providerDistance(provider: any): number | null {
    const suppliedDistance = this.optionalNumber(provider?.distanceKm ?? provider?.distance);
    if (suppliedDistance != null) {
      return suppliedDistance;
    }

    const origin = this.userLocation();
    const destination = this.toLocation(provider)
      ?? this.toLocation(provider?.locations?.[0])
      ?? this.toLocation(provider?.user?.address);
    if (!origin || !destination) {
      return null;
    }

    const radians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = radians(destination.lat - origin.lat);
    const longitudeDelta = radians(destination.lng - origin.lng);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat))
      * Math.sin(longitudeDelta / 2) ** 2;

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
    return value != null && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
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

    const clientId = this.#userLoggedService.user().user?.id;
    if (!clientId || !providerId) {
      this.favoriteError.update((state) => ({
        ...state,
        [String(providerId)]: 'Não é possível atualizar favoritos no momento.'
      }));
      return;
    }

    const providerKey = String(providerId);
    const currentlyFavorite = this.isFavorite(providerId);
    const nextState = !currentlyFavorite;

    this.favoriteLoading.update((state) => ({
      ...state,
      [providerKey]: true
    }));
    this.favoriteError.update((state) => ({
      ...state,
      [providerKey]: ''
    }));

    const request = nextState
      ? this.#provider.addFavorite(String(clientId), providerKey)
      : this.#provider.removeFavorite(String(clientId), providerKey);

    request.subscribe({
      next: () => {
        this.favorites.update((state) => ({
          ...state,
          [providerKey]: nextState
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.favoriteError.update((state) => ({
          ...state,
          [providerKey]: error.error?.message || 'Erro ao atualizar favorito.'
        }));
      },
      complete: () => {
        this.favoriteLoading.update((state) => ({
          ...state,
          [providerKey]: false
        }));
      }
    });
  }

  private loadFavorites(clientId: string) {
    this.#provider.listFavorites(clientId).subscribe({
      next: (response: any) => {
        const items = response?.items ?? response ?? [];
        const favoritesMap = (items as any[]).reduce((acc, item) => {
          const id = String(item.providerId ?? item.id ?? '');
          if (id) {
            acc[id] = true;
          }
          return acc;
        }, {} as Record<string, boolean>);

        this.favorites.set(favoritesMap);
      }
    });
  }

  redirectToProfile(profileId: string) {
    this.#router.navigateByUrl('/customer/' + profileId);
  }
}
