import { Routes } from '@angular/router';

export const AuthRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `Seja bem vindo `,
    loadComponent: () => import('@modules/auth/auth/auth').then(c => c.Auth),
    data: { animation: 'home' },
  },
  {
    path: 'login',
    title: `Login `,
    loadComponent: () => import('@modules/auth/login/login').then(c => c.Login),
    data: { animation: 'login' }
  },
  {
    path: 'register',
    title: `Cadastro de Cliente `,
    loadComponent: () => import('@modules/auth/register/register').then(c => c.Register),
    data: { animation: 'create-customer' }
  },
];
