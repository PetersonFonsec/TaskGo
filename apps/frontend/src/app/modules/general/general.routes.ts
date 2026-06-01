import { Routes } from '@angular/router';

import { History } from './profile/history/history';
import { Address } from './profile/address/address';
import { Profile } from './profile/profile';
import { Home } from './profile/home/home';

export const GeneralRoutes: Routes = [
  {
    path: ':userId',
    title: `Seja bem vindo ao TaskGo`,
    component: Profile,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        component: Home,
      },
      {
        path: 'profile',
        children: [
          {
            path: 'view',
            loadComponent: () => import('@modules/general/profile/view/profile-view').then(m => m.ProfileView),
          },
          {
            path: 'edit',
            loadComponent: () => import('@modules/general/profile/edit/profile-edit').then(m => m.ProfileEdit),
          },
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'view',
          },
        ],
      },
      {
        path: 'history',
        component: History,
      },
      {
        path: 'addresses',
        component: Address,
      }
    ],
  },
];
