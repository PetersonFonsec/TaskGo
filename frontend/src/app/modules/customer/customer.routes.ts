import { Routes } from '@angular/router';

export const CustomerRoutes: Routes = [
  {
    path: '',
    title: `Login `,
    loadComponent: () => import('@modules/auth/login/login').then(c => c.Login),
    data: { animation: 'login' }
  },
];
