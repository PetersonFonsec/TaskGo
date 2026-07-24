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
import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';

export const routes: Routes = [
  { path: '', redirectTo: UrlBase.AUTHENTICATE, pathMatch: 'full' },
  {
    path: 'orders/:id/payment',
    title: 'Pagamento do pedido',
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.CUSTOMER])],
    loadComponent: () => import('@modules/orders/order-payment/order-payment.page').then((c) => c.OrderPaymentPage),
  },
  {
    path: 'orders/:id/review',
    title: 'Avaliar atendimento',
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.CUSTOMER])],
    loadComponent: () =>
      import('@modules/orders/review-order/review-order.page').then((c) => c.ReviewOrderPage),
  },
  {
    path: 'orders/:id/confirm',
    title: 'Confirmar conclusão',
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.CUSTOMER])],
    loadComponent: () =>
      import('@modules/orders/confirm-service/confirm-service.page').then((c) => c.ConfirmServicePage),
  },
  {
    path: 'orders/:id/finish',
    title: 'Finalizar serviço',
    canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.PROVIDER])],
    loadComponent: () =>
      import('@modules/orders/finish-service/finish-service.page').then((c) => c.FinishServicePage),
  },
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
    path: '',
    component: AuthenticatedShell,
    children: [
      {
        path: UrlBase.PROVIDER,
        component: Provider,
        canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.PROVIDER])],
        children: ProvidersRoutes,
      },
      {
        path: UrlBase.CUSTOMER,
        component: Customer,
        canActivate: [unauthorizedGuard, permissionByRoleGuard([RolesBack.CUSTOMER])],
        children: CustomerRoutes,
      },
      {
        path: UrlBase.GENERAL,
        component: General,
        children: GeneralRoutes,
      },
    ],
  },
  { path: '**', component: NotFound }
];
