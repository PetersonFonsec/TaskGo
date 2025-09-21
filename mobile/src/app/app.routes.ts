import { Routes } from '@angular/router';

import { permissionByRoleGuard } from '@shared/guards/permission-by-role/permission-by-role.guard';
import { unauthorizedGuard } from '@shared/guards/unauthorized/unauthorized.guard';
import { userLoggedGuard } from '@shared/guards/userLogged/user-logged.guard';
import { UrlBase } from '@shared/enums/url-base.enum';
import { Roles } from '@shared/enums/roles.enum';

import { IndexPage as RegisterIndexPage } from './modules/register/pages/index/index.page';
import { IndexPage as CustomerIndexPage } from './modules/customer/pages/index/index.page';
import { IndexPage as ProviderIndexPage } from './modules/provider/page/index/index.page';
import { IndexPage as AuthIndexPage } from './modules/auth/pages/index/index.page';

import { AuthRoutes } from './modules/auth/auth.routes';
import { RegisterRoutes } from './modules/register/register.routes';
import { CustomerRoutes } from './modules/customer/customer.routes';
import { ProviderRoutes } from './modules/provider/provider.routes';

export const routes: Routes = [
  { path: '', redirectTo: UrlBase.AUTHENTICATE, pathMatch: 'full' },
  {
    path: UrlBase.AUTHENTICATE,
    component: AuthIndexPage,
    // canActivate: [userLoggedGuard],
    children: AuthRoutes
  },
  {
    path: UrlBase.REGISTER,
    component: RegisterIndexPage,
    // canActivate: [userLoggedGuard],
    children: RegisterRoutes
  },
  {
    path: UrlBase.CUSTOMER,
    component: CustomerIndexPage,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([Roles.CUSTOMER])],
    children: CustomerRoutes
  },
  {
    path: UrlBase.PROVIDER,
    component: ProviderIndexPage,
    canActivate: [unauthorizedGuard, permissionByRoleGuard([Roles.PROVIDER])],
    children: ProviderRoutes
  }
];
