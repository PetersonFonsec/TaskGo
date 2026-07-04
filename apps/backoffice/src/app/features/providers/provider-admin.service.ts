import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import {
  ProviderDashboard,
  ProviderDashboardQuery,
  ProviderDecision,
  ProviderDetailsResponse,
  ProviderLifecycleResponse,
  ProviderPage,
  ProviderPageQuery,
  ProviderQueueItem,
} from './provider-admin.models';

@Injectable({
  providedIn: 'root',
})
export class ProviderAdminService {
  readonly #http = inject(HttpClient);
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);

  dashboard(query: ProviderDashboardQuery): Observable<ProviderDashboard> {
    return this.#http.get<ProviderDashboard>(this.#adminUrl('/dashboard/providers'), {
      params: this.#queryParams(query),
    });
  }

  list(query: ProviderPageQuery): Observable<ProviderPage<ProviderQueueItem>> {
    return this.#http.get<ProviderPage<ProviderQueueItem>>(this.#adminUrl('/providers'), {
      params: this.#queryParams(query),
    });
  }

  get(id: string): Observable<ProviderDetailsResponse> {
    return this.#http.get<ProviderDetailsResponse>(this.#adminUrl(`/providers/${id}`));
  }

  history(id: string, query: ProviderPageQuery): Observable<ProviderPage<ProviderDecision>> {
    return this.#http.get<ProviderPage<ProviderDecision>>(
      this.#adminUrl(`/providers/${id}/history`),
      {
        params: this.#queryParams(query),
      },
    );
  }

  approve(id: string): Observable<ProviderLifecycleResponse> {
    return this.#http.post<ProviderLifecycleResponse>(
      this.#adminUrl(`/providers/${id}/approve`),
      {},
    );
  }

  reject(id: string, reason: string): Observable<ProviderLifecycleResponse> {
    return this.#http.post<ProviderLifecycleResponse>(this.#adminUrl(`/providers/${id}/reject`), {
      reason,
    });
  }

  block(id: string, reason: string): Observable<ProviderLifecycleResponse> {
    return this.#http.post<ProviderLifecycleResponse>(this.#adminUrl(`/providers/${id}/block`), {
      reason,
    });
  }

  unblock(id: string, reason: string): Observable<ProviderLifecycleResponse> {
    return this.#http.post<ProviderLifecycleResponse>(this.#adminUrl(`/providers/${id}/unblock`), {
      reason,
    });
  }

  #queryParams(query: ProviderDashboardQuery | ProviderPageQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

  #adminUrl(path: string): string {
    return `${this.#environment.apiUrl}${path}`;
  }
}
