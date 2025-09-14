import { Routes } from '@angular/router';
import { IndexPage } from './pages/index/index.page';
import { HomePage } from './pages/home/home.page';

/**
 * @description Aqui vai ter apenas as rotas visiveis para os usuarios que tiverem o perfil de estudantes "STUDENT"
 */
export const CustomerRoutes: Routes = [
  {
    path: '',
    component: IndexPage,
    data: { animation: 'WelcomePage' },
  },
  {
    path: 'home',
    component: HomePage,
    data: { animation: 'recov' }
  },
];
