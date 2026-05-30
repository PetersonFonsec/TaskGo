import { Routes } from '@angular/router';

export const AuthRoutes: Routes = [
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
  {
    path: 'address',
    title: `Cadastro de Endereço `,
    loadComponent: () => import('@modules/auth/register/address/address').then(c => c.Address),
    data: { animation: 'create-customer' }
  },
  {
    path: 'category',
    title: `Cadastro de Categoria `,
    loadComponent: () => import('@modules/auth/register/category/category').then(c => c.Category),
    data: { animation: 'create-customer' }
  },
  {
    path: 'category/:categoryId/service',
    title: `Cadastro de Serviços `,
    loadComponent: () => import('@modules/auth/register/services/services').then(c => c.Services),
    data: { animation: 'create-customer' }
  },
  {
    path: 'profile',
    title: `Cadastro de Cliente `,
    loadComponent: () => import('@modules/auth/register/profile/profile').then(c => c.Profile),
    data: { animation: 'create-customer' }
  },
  {
    path: 'contact',
    title: `Cadastro de Cliente `,
    loadComponent: () => import('@modules/auth/register/social/social').then(c => c.Social),
    data: { animation: 'create-customer' }
  },
];
