import { Routes } from '@angular/router';
import { IndexPage } from './page/index/index.page';

/**
 * @description Aqui vai ter apenas as rotas visiveis para os usuarios que tiverem o perfil
 */
export const ProviderRoutes: Routes = [
  {
    path: '',
    component: IndexPage,
    title: `Seja bem vindo`,
    data: { animation: 'WelcomePage' },
  },
];
