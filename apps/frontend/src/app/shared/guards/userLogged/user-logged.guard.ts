import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TokenService } from '@shared/service/token/token.service';
import { Utils } from '@shared/service/utils/utils.service';

/**
 * @description:
 * Guard para verificar se o usuário já está logado, caso esteja, 
 * redireciona para a rota correspondente ao seu tipo de usuário
 * 
 * @returns The `userLoggedGuard` function is returning `false`.
 */
export const userLoggedGuard: CanActivateChildFn = (childRoute, state) => {
  const tokenService = inject(TokenService);
  if (!tokenService.token) return true;

  const user = inject(UserLoggedService).user().user as any;
  if (!user) return true;

  const router = inject(Router);
  router.navigateByUrl(Utils.getRouteByRoleBack(user.type));

  return false;
};
