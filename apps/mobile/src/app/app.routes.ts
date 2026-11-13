import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: '' }
];
