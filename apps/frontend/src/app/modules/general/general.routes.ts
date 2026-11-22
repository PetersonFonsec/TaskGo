import { Routes } from '@angular/router';

import { sessionUserGuard } from '@shared/guards/session-user/session-user.guard';
import { unauthorizedGuard } from '@shared/guards/unauthorized/unauthorized.guard';

import { History } from './profile/history/history';
import { Address } from './profile/address/address';
import { Profile } from './profile/profile';
import { Home } from './profile/home/home';

export const GeneralRoutes: Routes = [
  // Pedidos é uma tela própria do shell, sem o cabeçalho de perfil da conta.
  // Só com login; o id da URL é corrigido para o da sessão (a tela nunca usa o da URL).
  {
    path: ':userId/history',
    title: 'Pedidos',
    canActivate: [unauthorizedGuard, sessionUserGuard],
    component: History,
  },
  // Dados pessoais também é tela própria do shell, sem o cabeçalho de perfil
  // da conta, com as mesmas guardas de Pedidos.
  {
    path: ':userId/profile',
    canActivate: [unauthorizedGuard, sessionUserGuard],
    children: [
      {
        path: 'view',
        title: 'Dados pessoais',
        loadComponent: () =>
          import('@modules/general/profile/view/profile-view').then((m) => m.ProfileView),
      },
      {
        path: 'edit',
        title: 'Editar dados pessoais',
        loadComponent: () =>
          import('@modules/general/profile/edit/profile-edit').then((m) => m.ProfileEdit),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'view',
      },
    ],
  },
  // Conta também é uma tela própria do shell (destino da aba "Conta"), com as
  // mesmas regras de sessão de Pedidos.
  {
    path: ':userId/home',
    title: 'Conta',
    canActivate: [unauthorizedGuard, sessionUserGuard],
    component: Home,
  },
  {
    path: ':userId',
    pathMatch: 'full',
    redirectTo: ':userId/home',
  },
  {
    path: ':userId',
    title: `Seja bem vindo ao TaskGo`,
    canActivate: [unauthorizedGuard, sessionUserGuard],
    component: Profile,
    children: [
      {
        path: 'addresses',
        component: Address,
      },
    ],
  },
];
