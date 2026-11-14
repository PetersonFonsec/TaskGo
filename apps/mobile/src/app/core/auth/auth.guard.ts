import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Telas da conta: sem sessão, vai para o login e volta para cá depois. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restore();
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/entrar'], { queryParams: { voltar: state.url } });
};
