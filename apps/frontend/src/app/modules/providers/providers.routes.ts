import { Routes } from '@angular/router';

export const ProvidersRoutes: Routes = [
  {
    path: 'services',
    title: 'Meus serviços',
    loadComponent: () =>
      import('./services/provider-services.page').then((c) => c.ProviderServicesPage),
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
