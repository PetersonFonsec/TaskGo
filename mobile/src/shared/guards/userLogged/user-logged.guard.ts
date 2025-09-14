import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { TokenService } from '@shared/services/token/token.service';
import { UserLoggedService } from '@shared/services/user-logged/user-logged.service';
import { Utils } from '@shared/services/utils/utils.service';

export const userLoggedGuard: CanActivateChildFn = (childRoute, state) => {
  const tokenService = inject(TokenService);
  if (!tokenService.token) return true;

  const user = inject(UserLoggedService).user().user;
  const router = inject(Router);

  if (!user) return true;

  router.navigateByUrl(Utils.getRouteByRole(user.role));

  return false;
};
