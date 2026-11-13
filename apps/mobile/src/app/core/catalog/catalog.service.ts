import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { Category, Paginated, PublicProvider } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;

  categories(): Observable<readonly Category[]> {
    return this.#http
      .get<Paginated<Category>>(`${this.#apiUrl}/categories`, { params: { limit: 100 } })
      .pipe(map((page) => page.data));
  }

  providersByCategory(
    slug: string,
    near?: { lat: number; lng: number }
  ): Observable<readonly PublicProvider[]> {
    let params = new HttpParams();
    if (near) params = params.set('lat', near.lat).set('lng', near.lng);
    return this.#http.get<PublicProvider[]>(
      `${this.#apiUrl}/provider/by-category/${encodeURIComponent(slug)}`,
      { params }
    );
  }
}

/** Busca sem acento e sem diferenciar maiúsculas: "eletrica" acha "Elétrica". */
export function matchesSearch(text: string, term: string): boolean {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return normalize(text).includes(normalize(term));
}
