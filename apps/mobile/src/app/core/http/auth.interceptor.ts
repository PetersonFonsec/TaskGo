import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';

const SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;
  if (!isApiRequest(request.url, apiUrl) || isSessionEndpoint(request.url, apiUrl)) {
    return next(request);
  }
  const auth = inject(AuthService);

  return from(auth.accessToken()).pipe(
    switchMap((token) =>
      next(withToken(request, token)).pipe(
        catchError((error: unknown) => {
          if (!token || !(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          return from(auth.accessTokenAfterRejection(token)).pipe(
            switchMap((fresh) =>
              fresh ? next(withToken(request, fresh)) : throwError(() => error)
            )
          );
        })
      )
    )
  );
};

function withToken(request: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}

export function isApiRequest(url: string, apiUrl: string): boolean {
  return url === apiUrl || url.startsWith(`${apiUrl}/`);
}

function isSessionEndpoint(url: string, apiUrl: string): boolean {
  const path = url.slice(apiUrl.length).split('?')[0];
  return SESSION_ENDPOINTS.includes(path);
}
