import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIf } from '@angular/common';

import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NgIf],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites implements OnInit {
  #userLoggedService = inject(UserLoggedService);
  #provider = inject(Provider);

  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favoriteLoading = signal<Record<string, boolean>>({});
  favoriteError = signal<Record<string, string>>({});
  providers = signal<any[]>([]);
  isLoading = signal(false);

  ngOnInit(): void {
    const clientId = this.#userLoggedService.user().user?.id;

    if (!this.favoritesEnabled || !clientId) {
      return;
    }

    this.loadFavorites(String(clientId));
  }

  isFavorite(providerId: any) {
    return this.providers().some(provider => String(provider.id) === String(providerId));
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
    const currentlyFavorite = this.isFavorite(providerKey);

    this.favoriteLoading.update((state) => ({
      ...state,
      [providerKey]: true
    }));
    this.favoriteError.update((state) => ({
      ...state,
      [providerKey]: ''
    }));

    const request = currentlyFavorite
      ? this.#provider.removeFavorite(String(clientId), providerKey)
      : this.#provider.addFavorite(String(clientId), providerKey);

    request.subscribe({
      next: () => {
        if (currentlyFavorite) {
          this.providers.update((items) => items.filter((provider) => String(provider.id) !== providerKey));
        }
      },
      error: (error: HttpErrorResponse) => {
        this.favoriteError.update((state) => ({
          ...state,
          [providerKey]: error.error?.message || 'Erro ao atualizar favoritos.'
        }));
      },
      complete: () => {
        this.favoriteLoading.update((state) => {
          const nextState = { ...state };
          delete nextState[providerKey];
          return nextState;
        });
      }
    });
  }

  private loadFavorites(clientId: string) {
    this.isLoading.set(true);
    this.#provider.listFavorites(clientId).subscribe({
      next: (response: any) => {
        const items = response?.items ?? [];
        const providers = (items as any[]).map((item) => item.provider ?? item);
        this.providers.set(providers);
      },
      complete: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }
}
