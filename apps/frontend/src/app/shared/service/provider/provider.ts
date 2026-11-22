import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import {
  FavoriteListResponse,
  hireProviderRequest,
  ProviderAvailabilityResponse,
} from './provider.model';

export interface ProviderAvailabilityQuery {
  from: string;
  to: string;
  serviceId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Provider {
  readonly #urlBase = environment.url + '/provider';
  readonly #http = inject(HttpClient);

  findProvidersByCategorySlug(
    categorySlug: string | undefined,
    options?: {
      onlyFavorites?: boolean;
      lat?: number;
      lng?: number;
      minimumRating?: number;
      maximumDistance?: number;
      minimumPrice?: number | null;
      maximumPrice?: number | null;
    },
  ) {
    let params = new HttpParams();

    if (options?.lat != null && options?.lng != null) {
      params = params.set('lat', options.lat).set('lng', options.lng);
    }
    if (options?.onlyFavorites) {
      params = params.set('onlyFavorites', 'true');
    }
    if (options?.minimumRating) params = params.set('minimumRating', options.minimumRating);
    if (options?.maximumDistance) params = params.set('maximumDistance', options.maximumDistance);
    if (options?.minimumPrice != null) params = params.set('minimumPrice', options.minimumPrice);
    if (options?.maximumPrice != null) params = params.set('maximumPrice', options.maximumPrice);

    const url = categorySlug
      ? `${this.#urlBase}/by-category/${encodeURIComponent(categorySlug)}`
      : this.#urlBase;
    return this.#http.get(url, { params });
  }

  hireProvider(payload: hireProviderRequest) {
    return this.#http.post<{ id: string }>(`${environment.url}/order`, payload);
  }

  getAvailability(providerId: string, query: ProviderAvailabilityQuery) {
    let params = new HttpParams().set('from', query.from).set('to', query.to);

    if (query.serviceId) {
      params = params.set('serviceId', query.serviceId);
    }

    return this.#http.get<ProviderAvailabilityResponse>(
      `${this.#urlBase}/${providerId}/availability`,
      { params },
    );
  }

  listFavorites(clientId: string, paging?: { skip?: number; take?: number }) {
    let params = new HttpParams();
    if (paging?.skip != null) params = params.set('skip', paging.skip);
    if (paging?.take != null) params = params.set('take', paging.take);
    return this.#http.get<FavoriteListResponse>(`${environment.url}/favorites`, { params });
  }

  addFavorite(clientId: string, providerId: string) {
    return this.#http.post<any>(`${environment.url}/favorites`, {
      providerId,
    });
  }

  removeFavorite(clientId: string, providerId: string) {
    return this.#http.delete<any>(`${environment.url}/favorites/${providerId}`);
  }
}
