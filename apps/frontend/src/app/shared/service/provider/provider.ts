import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { hireProviderRequest } from './provider.model';

@Injectable({
  providedIn: 'root'
})
export class Provider {
  readonly #urlBase = environment.url + '/provider';
  readonly #http = inject(HttpClient);

  findProvidersByCategorySlug(categorySlug: string) {
    return this.#http.get(this.#urlBase + `/by-category/${categorySlug}`);
  }

  hireProvider(payload: hireProviderRequest) {
    return this.#http.post(`${environment.url}/order`, payload);
  }
}
