import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { TokenService } from '@shared/service/token/token.service';

/**
 * @description Clona o request e adiciona o token de autenticação no header Authorization, caso exista um token válido.
 * @param req O request original.
 * @param next O próximo interceptor ou o backend.
 * @returns O request modificado com o token de autenticação, ou o request original se não houver token.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  if (!tokenService.token || !isApiUrl(req.url)) return next(req);

  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${tokenService.token}`,
      Accept: 'application/json',
    },
  });

  return next(req);
};

export function isApiUrl(url: string): boolean {
  try {
    const base = new URL(environment.url);
    const target = new URL(url, base);
    const prefix = base.pathname.replace(/\/$/, '');
    return (
      target.origin === base.origin &&
      (target.pathname === prefix || target.pathname.startsWith(prefix + '/'))
    );
  } catch {
    return false;
  }
}
