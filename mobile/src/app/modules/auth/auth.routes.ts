import { Routes } from '@angular/router';
import { IndexPage } from './pages/index/index.page';
import { LoginPage } from './pages/login/login.page';
import { NewPasswordPage } from './pages/new-password/new-password.page';
import { WellcomePage } from './pages/wellcome/wellcome.page';

/**
 * @description Aqui vai ter apenas as rotas
 */
export const AuthRoutes: Routes = [
  { path: '', redirectTo: "index", pathMatch: 'full' },
  {
    path: 'index',
    component: WellcomePage,
    title: `Seja bem vindo`,
    data: { animation: 'WelcomePage' },
  },
  {
    path: 'login',
    component: LoginPage,
    title: `Acesse seu perfil`,
    data: { animation: 'WelcomePage' },
  },
  {
    path: 'forgot',
    component: NewPasswordPage,
    title: `Recupere a sua senha`,
    data: { animation: 'WelcomePage' },
  },
];
