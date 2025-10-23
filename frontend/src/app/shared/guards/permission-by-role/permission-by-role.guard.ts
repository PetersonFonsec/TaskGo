import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';

export const permissionByRoleGuard = (roles: string[]) => {
  const guard: CanActivateFn = (route, state) => {
    const user = inject(UserLoggedService).user().user;
    const router = inject(Router);

    if (!roles.includes(user.role)) {
      router.navigateByUrl(Utils.getRouteByRole(user.role));
    }

    return roles.includes(user.role);
  };

  return guard;
}
