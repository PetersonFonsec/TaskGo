import { Routes } from '@angular/router';

export const ProvidersRoutes: Routes = [
  {
    path: 'services',
    title: 'Meus serviços',
    loadComponent: () =>
      import('./services/provider-services.page').then((c) => c.ProviderServicesPage),
  },
  {
    path: 'payouts',
    title: 'Recebimentos',
    loadComponent: () =>
      import('./payouts/provider-payouts.page').then((c) => c.ProviderPayoutsPage),
  },
  {
    path: '',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo`,
    loadComponent: () => import('@modules/providers/home/home').then((c) => c.ProviderHomePage),
  },
  {
    path: ':orderId/aprovacao',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo`,
    loadComponent: () =>
      import('@modules/providers/pending-approval/pending-approval').then((c) => c.PendingApproval),
  },
];
