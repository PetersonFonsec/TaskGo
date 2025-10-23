import { Routes } from '@angular/router';

export const ProvidersRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo - Portal do Estudante`,
    loadComponent: () => import('@modules/providers/home/home').then(c => c.Home),
  },
];
