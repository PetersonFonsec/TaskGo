import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { FunnelMetrics, FunnelMetricsQuery } from './funnel-metrics.models';

@Injectable({
  providedIn: 'root',
})
export class FunnelMetricsService {
  readonly #http = inject(HttpClient);
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);

  funnel(query: FunnelMetricsQuery): Observable<FunnelMetrics> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return this.#http.get<FunnelMetrics>(`${this.#environment.apiUrl}/metrics/funnel`, {
      params,
    });
  }
}
