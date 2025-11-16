import { Routes } from '@angular/router';

export const CustomerRoutes: Routes = [
  {
    path: '',
    title: `Seja Bem Vindo !!`,
    loadComponent: () => import('@modules/customer/home/home').then(c => c.Home),
    data: { animation: 'login' }
  },
  {
    path: 'search',
    title: `Busca Por Profissionais`,
    loadComponent: () => import('@modules/customer/search/search').then(c => c.Search),
    data: { animation: 'login' }
  },
  {
    path: ':userId',
    title: `Perfil do profissional`,
    loadComponent: () => import('@modules/common/single-user/single-user').then(c => c.SingleUser),
    data: { animation: 'login' }
  },
];
