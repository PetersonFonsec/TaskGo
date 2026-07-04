import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import {
  AuditLogDetailResponse,
  AuditLogListItem,
  AuditLogPage,
  AuditLogQuery,
} from './audit-log.models';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  readonly #http = inject(HttpClient);
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);

  list(query: AuditLogQuery): Observable<AuditLogPage<AuditLogListItem>> {
    return this.#http.get<AuditLogPage<AuditLogListItem>>(this.#adminUrl('/audit-logs'), {
      params: toAuditHttpParams(query),
    });
  }

  get(id: string): Observable<AuditLogDetailResponse> {
    return this.#http.get<AuditLogDetailResponse>(this.#adminUrl(`/audit-logs/${id}`));
  }

  #adminUrl(path: string): string {
    return `${this.#environment.apiUrl}${path}`;
  }
}

export function toAuditHttpParams(query: AuditLogQuery): HttpParams {
  let params = new HttpParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });
  return params;
}
