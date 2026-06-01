import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from "@angular/core";
import { TokenService } from '@shared/service/token/token.service';

/**
 * @description Clona o request e adiciona o token de autenticação no header Authorization, caso exista um token válido.
 * @param req O request original.
 * @param next O próximo interceptor ou o backend.
 * @returns O request modificado com o token de autenticação, ou o request original se não houver token.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  if (!tokenService.token) return next(req);

  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${tokenService.token}`,
      Accept: 'application/json',
    },
  });

  return next(req);
};
