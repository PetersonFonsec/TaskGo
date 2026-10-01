import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@shared/service/token/token.service';

export const unauthorizedGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.token) {
    return router.createUrlTree(['/authenticate/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return !!tokenService.token;
};
