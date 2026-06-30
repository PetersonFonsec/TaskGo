import { Routes } from '@angular/router';

import { InstitutionalRoutes } from '@modules/institutional/institutional.routes';
import { InstitutionalPage } from '@modules/institutional/institutional-page';
import { ProvidersRoutes } from '@modules/providers/providers.routes';
import { GeneralRoutes } from '@modules/general/general.routes';
import { Provider } from '@modules/providers/provider';
import { CustomerRoutes } from '@modules/customer/customer.routes';
import { Customer } from '@modules/customer/customer';
import { AuthRoutes } from '@modules/auth/auth.routes';
import { General } from '@modules/general/general';
import { AuthPage } from '@modules/auth/auth-page';

import { permissionByRoleGuard } from '@shared/guards/permission-by-role/permission-by-role.guard';
import { unauthorizedGuard } from '@shared/guards/unauthorized/unauthorized.guard';
import { userLoggedGuard } from '@shared/guards/userLogged/user-logged.guard';
import { UrlBase } from '@shared/enums/base-url.enum';
import { RolesBack } from '@shared/enums/roles.enum';
import { NotFound } from '@modules/common/not-found/not-found';

export const routes: Routes = [
  { path: '', redirectTo: UrlBase.AUTHENTICATE, pathMatch: 'full' },
  {
    path: 'orders/:id',
    title: 'Detalhes do pedido',
    canActivate: [unauthorizedGuard],
    loadComponent: () =>
      import('@modules/orders/order-details/order-details.page').then((c) => c.OrderDetailsPage),
  },
  {
    path: UrlBase.INSTITUTIONAL,
    component: InstitutionalPage,
    children: InstitutionalRoutes,
  },
  {
    path: UrlBase.AUTHENTICATE,
    component: AuthPage,
    children: AuthRoutes,
    canActivate: [userLoggedGuard],
  },
  {
    path: UrlBase.PROVIDER,
    component: Provider,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.PROVIDER])],
    children: ProvidersRoutes
  },
  {
    path: UrlBase.CUSTOMER,
    component: Customer,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.CUSTOMER])],
    children: CustomerRoutes
  },
  {
    path: UrlBase.GENERAL,
    component: General,
    // canActivate: [unauthorizedGuard],
    children: GeneralRoutes
  },
  { path: '**', component: NotFound }
];
