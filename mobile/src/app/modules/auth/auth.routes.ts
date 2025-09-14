import { Routes } from '@angular/router';
import { IndexPage } from './pages/index/index.page';

/**
 * @description Aqui vai ter apenas as rotas visiveis para os usuarios que tiverem o perfil de estudantes "STUDENT"
 */
export const AuthRoutes: Routes = [
  {
    path: '',
    component: IndexPage,
    title: `Seja bem vindo`,
    data: { animation: 'WelcomePage' },
  },
];
