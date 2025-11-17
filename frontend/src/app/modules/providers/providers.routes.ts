import { Routes } from '@angular/router';

export const ProvidersRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo`,
    loadComponent: () => import('@modules/providers/home/home').then(c => c.Home),
  },
  {
    path: ':orderId/aprovacao',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo`,
    loadComponent: () => import('@modules/providers/pending-approval/pending-approval').then(c => c.PendingApproval),
  },
];
