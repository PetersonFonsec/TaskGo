import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { hireProviderRequest, ProviderAvailabilityResponse } from './provider.model';

export interface ProviderAvailabilityQuery {
  from: string;
  to: string;
  serviceId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Provider {
  readonly #urlBase = environment.url + '/provider';
  readonly #http = inject(HttpClient);

  findProvidersByCategorySlug(categorySlug: string, options?: { onlyFavorites?: boolean }) {
    let params = new HttpParams();

    if (options?.onlyFavorites) {
      params = params.set('onlyFavorites', 'true');
    }

    return this.#http.get(this.#urlBase + `/by-category/${categorySlug}`, { params });
  }

  hireProvider(payload: hireProviderRequest) {
    return this.#http.post(`${environment.url}/order`, payload);
  }

  getAvailability(providerId: string, query: ProviderAvailabilityQuery) {
    let params = new HttpParams().set('from', query.from).set('to', query.to);

    if (query.serviceId) {
      params = params.set('serviceId', query.serviceId);
    }

    return this.#http.get<ProviderAvailabilityResponse>(
      `${this.#urlBase}/${providerId}/availability`,
      { params }
    );
  }

  listFavorites(clientId: string) {
    return this.#http.get<any>(`${environment.url}/favorites`);
  }

  addFavorite(clientId: string, providerId: string) {
    return this.#http.post<any>(`${environment.url}/favorites`, {
      providerId
    });
  }

  removeFavorite(clientId: string, providerId: string) {
    return this.#http.delete<any>(`${environment.url}/favorites/${providerId}`);
  }
}
