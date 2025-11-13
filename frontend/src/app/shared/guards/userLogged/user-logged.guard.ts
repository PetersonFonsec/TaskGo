import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TokenService } from '@shared/service/token/token.service';
import { Utils } from '@shared/service/utils/utils.service';

export const userLoggedGuard: CanActivateChildFn = (childRoute, state) => {
  const tokenService = inject(TokenService);
  if (!tokenService.token) return true;

  const user = inject(UserLoggedService).user().user;
  const router = inject(Router);

  if (!user) return true;

  router.navigateByUrl(Utils.getRouteByRole(user.type));

  return false;
};
