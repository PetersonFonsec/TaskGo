import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

export const adminTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AdminAuthService);
  const environment = inject(BACKOFFICE_ENVIRONMENT);
  const isAdminRequest = isConfiguredAdminApiRequest(request.url, environment.apiUrl);
  const token = auth.token();
  const authorizedRequest =
    isAdminRequest && token
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        })
      : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (isAdminRequest && error instanceof HttpErrorResponse && shouldExpireSession(error)) {
        auth.expireSession();
      }

      return throwError(() => error);
    })
  );
};

export function isConfiguredAdminApiRequest(requestUrl: string, apiUrl: string): boolean {
  if (apiUrl.startsWith('/')) {
    return requestUrl === apiUrl || requestUrl.startsWith(`${apiUrl}/`);
  }

  try {
    const request = new URL(requestUrl, window.location.origin);
    const api = new URL(apiUrl, window.location.origin);

    return request.origin === api.origin && request.pathname.startsWith(api.pathname);
  } catch {
    return false;
  }
}

function shouldExpireSession(error: HttpErrorResponse): boolean {
  if (error.status === 401) {
    return true;
  }

  if (error.status !== 403) {
    return false;
  }

  const message = extractMessage(error.error).toLowerCase();
  return (
    message.includes('inactive') ||
    message.includes('deactivated') ||
    message.includes('stale') ||
    message.includes('invalidated') ||
    message.includes('token')
  );
}

function extractMessage(errorBody: unknown): string {
  if (typeof errorBody === 'string') {
    return errorBody;
  }

  if (typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody) {
    const message = (errorBody as { message: unknown }).message;
    return Array.isArray(message) ? message.join(' ') : String(message);
  }

  return '';
}
