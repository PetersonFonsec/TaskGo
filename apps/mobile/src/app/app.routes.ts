import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    // Abas (Início e Pedidos). "/" continua levando ao início.
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage)
      },
      {
        path: 'pedidos',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage)
      }
    ]
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
    path: 'pedidos/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/order/order.page').then((m) => m.OrderPage)
  },
  { path: '**', redirectTo: '' }
];
