import { Routes } from '@angular/router';
import { Profile } from './profile/profile';

export const GeneralRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: `Seja bem vindo ao TaskGo`,
    component: Profile
    // loadComponent: () => import('@modules/general/profile/profile.component').then(m => m.ProfileComponent),
  },
];
