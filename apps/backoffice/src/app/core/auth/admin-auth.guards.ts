import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from './admin-auth.service';
import type { TaskGoAdminRole } from '@taskgo/shared';

export const requireAdminSessionGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url === '/login' ? '/' : state.url }
  });
};

export const requireAnonymousAdminGuard: CanActivateFn = (route) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([route.queryParamMap.get('returnUrl') || '/']);
};

export function requireAdminRoleGuard(roles: readonly TaskGoAdminRole[]): CanActivateFn {
  return () => {
    const auth = inject(AdminAuthService);
    const router = inject(Router);
    const role = auth.operator()?.role;

    return role && roles.includes(role) ? true : router.createUrlTree(['/']);
  };
}
