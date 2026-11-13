import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage)
  },
  {
    path: 'categorias/:slug',
    loadComponent: () => import('./pages/category/category.page').then((m) => m.CategoryPage)
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'prestadores/:id',
    loadComponent: () => import('./pages/provider/provider.page').then((m) => m.ProviderPage)
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage)
  },
  {
    path: 'pedidos/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order/order.page').then((m) => m.OrderPage)
  },
  { path: '**', redirectTo: '' }
];
