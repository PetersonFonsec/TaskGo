import { Routes } from '@angular/router';

export const CustomerRoutes: Routes = [
  {
    path: '',
    title: `Login `,
    loadComponent: () => import('@modules/customer/home/home').then(c => c.Home),
    data: { animation: 'login' }
  },
];
