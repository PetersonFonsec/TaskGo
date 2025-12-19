import { Routes } from '@angular/router';

import { History } from './profile/history/history';
import { Address } from './profile/address/address';
import { Profile } from './profile/profile';
import { Home } from './profile/home/home';

export const GeneralRoutes: Routes = [
  {
    path: '',
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
