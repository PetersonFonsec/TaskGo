import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { CardDetail } from '@shared/components/ui/card-detail/card-detail';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { environment } from '@environments/environment';
import { switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [CardDetail, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search implements OnInit {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #provider = inject(Provider);
  #userLoggedService = inject(UserLoggedService);
  providers = signal<any>([]);
  category = signal('');
  onlyFavorites = signal(false);
  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favorites = signal<Record<string, boolean>>({});
  favoriteLoading = signal<Record<string, boolean>>({});
  favoriteError = signal<Record<string, string>>({});

  private get storageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  ngOnInit(): void {
    this.#route.queryParams.pipe(
      tap(({ categoria, onlyFavorites }) => {
        this.category.set(categoria);

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
        this.providers.set(params);

        const clientId = this.#userLoggedService.user().user?.id;
        if (this.favoritesEnabled && clientId) {
          this.loadFavorites(String(clientId));
        }
      }
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
}
