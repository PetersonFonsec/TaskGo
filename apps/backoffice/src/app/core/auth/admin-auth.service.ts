import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, tap, throwError } from 'rxjs';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import {
  AdminLoginRequest,
  AdminLoginResponse,
  AdminMeResponse,
  AdminSession
} from './admin-session.model';
import { AdminSessionStorageService } from './admin-session-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  readonly #http = inject(HttpClient);
  readonly #router = inject(Router);
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);
  readonly #storage = inject(AdminSessionStorageService);
  readonly #session = signal<AdminSession | null>(this.#storage.restore());
  readonly #redirectingToLogin = signal(false);

  readonly session = this.#session.asReadonly();
  readonly operator = computed(() => this.#session()?.operator ?? null);
  readonly token = computed(() => this.#session()?.token ?? '');
  readonly isAuthenticated = computed(() => this.#session() !== null);

  login(credentials: AdminLoginRequest): Observable<AdminSession> {
    return this.#http
      .post<AdminLoginResponse>(this.#adminUrl('/auth/login'), credentials)
      .pipe(
        map((response) => ({
          token: response.access_token,
          operator: response.operator
        })),
        tap((session) => this.establishSession(session))
      );
  }

  refreshCurrentOperator(): Observable<AdminSession> {
    return this.#http.get<AdminMeResponse>(this.#adminUrl('/auth/me')).pipe(
      map((response) => {
        const token = this.token();
        if (!token) {
          throw new Error('Missing administrative token.');
        }

        return { token, operator: response.operator };
      }),
      tap((session) => this.establishSession(session)),
      catchError((error) => {
        this.expireSession();
        return throwError(() => error);
      })
    );
  }

  establishSession(session: AdminSession): void {
    this.#storage.save(session);
    this.#session.set(session);
    this.#redirectingToLogin.set(false);
  }

  logout(): void {
    this.#storage.clear();
    this.#session.set(null);
    this.#router.navigateByUrl('/login');
  }

  expireSession(): void {
    this.#storage.clear();
    this.#session.set(null);

    if (!this.#redirectingToLogin()) {
      this.#redirectingToLogin.set(true);
      const returnUrl = this.#router.url && this.#router.url !== '/login' ? this.#router.url : '/';
      this.#router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  #adminUrl(path: string): string {
    return `${this.#environment.apiUrl}${path}`;
  }
}
