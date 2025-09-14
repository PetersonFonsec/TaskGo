import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@shared/services/token/token.service';

export const unauthorizedGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.token) {
    router.navigateByUrl('/authenticate/login')
  }

  return !!tokenService.token;
};
