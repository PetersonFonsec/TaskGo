import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { hireProviderRequest } from './provider.model';

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

  listFavorites(clientId: string) {
    return this.#http.get<any>(`${environment.url}/clients/${clientId}/favorites`);
  }

  addFavorite(clientId: string, providerId: string) {
    return this.#http.post<any>(`${environment.url}/clients/${clientId}/favorites`, {
      providerId
    });
  }

  removeFavorite(clientId: string, providerId: string) {
    return this.#http.delete<any>(`${environment.url}/clients/${clientId}/favorites/${providerId}`);
  }
}
