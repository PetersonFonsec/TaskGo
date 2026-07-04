import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import {
  AdminOperatorRecord,
  InviteOperatorRequest,
  InviteOperatorResponse,
  OperatorMutationResponse,
  OperatorPage,
  OperatorPageQuery
} from './operator-admin.models';

@Injectable({
  providedIn: 'root'
})
export class OperatorAdminService {
  readonly #http = inject(HttpClient);
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);

  list(query: OperatorPageQuery): Observable<OperatorPage<AdminOperatorRecord>> {
    return this.#http.get<OperatorPage<AdminOperatorRecord>>(this.#adminUrl('/users'), {
      params: this.#queryParams(query)
    });
  }

  invite(request: InviteOperatorRequest): Observable<InviteOperatorResponse> {
    return this.#http.post<InviteOperatorResponse>(this.#adminUrl('/users/invitations'), request);
  }

  changeRole(id: string, role: InviteOperatorRequest['role']): Observable<OperatorMutationResponse> {
    return this.#http.patch<OperatorMutationResponse>(this.#adminUrl(`/users/${id}/role`), { role });
  }

  activate(id: string): Observable<OperatorMutationResponse> {
    return this.#http.post<OperatorMutationResponse>(this.#adminUrl(`/users/${id}/activate`), {});
  }

  deactivate(id: string): Observable<OperatorMutationResponse> {
    return this.#http.post<OperatorMutationResponse>(this.#adminUrl(`/users/${id}/deactivate`), {});
  }

  #queryParams(query: OperatorPageQuery): HttpParams {
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
