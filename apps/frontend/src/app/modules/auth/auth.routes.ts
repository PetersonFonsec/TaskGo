import { Routes } from '@angular/router';
import { ACCOUNT_THEME } from './auth-page';

export const AuthRoutes: Routes = [
  {
    path: 'forgot-password',
    title: 'Recuperar acesso',
    loadComponent: () => import('./recovery/recovery.page').then((c) => c.RecoveryPage),
  },
  {
    path: 'reset-password',
    title: 'Criar nova senha',
    data: { reset: true },
    loadComponent: () => import('./recovery/recovery.page').then((c) => c.RecoveryPage),
  },
  {
    path: 'login',
    title: 'Entrar',
    loadComponent: () => import('@modules/auth/login/login').then((c) => c.Login),
    data: { animation: 'login' },
  },
  {
    path: 'register',
    title: 'Criar conta',
    loadComponent: () => import('@modules/auth/register/register').then((c) => c.Register),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
  {
    path: 'address',
    title: `Cadastro de Endereço `,
    loadComponent: () => import('@modules/auth/register/address/address').then((c) => c.Address),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
  {
    path: 'category',
    title: `Cadastro de Categoria `,
    loadComponent: () => import('@modules/auth/register/category/category').then((c) => c.Category),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
  {
    path: 'category/:categoryId/service',
    title: `Cadastro de Serviços `,
    loadComponent: () => import('@modules/auth/register/services/services').then((c) => c.Services),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
  {
    path: 'profile',
    title: `Cadastro de Cliente `,
    loadComponent: () => import('@modules/auth/register/profile/profile').then((c) => c.Profile),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
  {
    path: 'contact',
    title: `Cadastro de Cliente `,
    loadComponent: () => import('@modules/auth/register/social/social').then((c) => c.Social),
    data: { animation: 'create-customer', [ACCOUNT_THEME]: true },
  },
];
