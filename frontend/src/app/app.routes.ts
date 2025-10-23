import { Routes } from '@angular/router';

import { InstitutionalRoutes } from '@modules/institutional/institutional.routes';
import { AuthRoutes } from '@modules/auth/auth.routes';
import { AuthPage } from '@modules/auth/auth-page';

import { permissionByRoleGuard } from '@shared/guards/permission-by-role/permission-by-role.guard';
import { unauthorizedGuard } from '@shared/guards/unauthorized/unauthorized.guard';
import { userLoggedGuard } from '@shared/guards/userLogged/user-logged.guard';

import { UrlBase } from '@shared/enums/base-url.enum';
import { Roles } from '@shared/enums/roles.enum';
import { InstitutionalPage } from '@modules/institutional/institutional-page';
import { ProvidersRoutes } from '@modules/providers/providers.routes';
import { CustomerRoutes } from '@modules/customer/customer.routes';


export const routes: Routes = [
  { path: '', redirectTo: '/authenticate', pathMatch: 'full' },
  {
    path: UrlBase.AUTHENTICATE,
    component: AuthPage,
    canActivate: [userLoggedGuard],
    children: AuthRoutes
  },
  {
    path: UrlBase.INSTITUTIONAL,
    component: InstitutionalPage,
    children: InstitutionalRoutes,
  },
  {
    path: UrlBase.PROVIDER,
    component: InstitutionalPage,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([Roles.PROVIDER])],
    children: ProvidersRoutes
  },
  {
    path: UrlBase.CUSTOMER,
    component: InstitutionalPage,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([Roles.CUSTOMER])],
    children: CustomerRoutes
  },
  // { path: '**', component: NotFoundComponent } TODO - criar pagina 404
];
