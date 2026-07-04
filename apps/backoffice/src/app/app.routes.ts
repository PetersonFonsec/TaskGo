import { Routes } from '@angular/router';

import {
  requireAdminRoleGuard,
  requireAdminSessionGuard,
  requireAnonymousAdminGuard
} from './core/auth/admin-auth.guards';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { LoginPage } from './features/login/login.page';
import { NotFoundPage } from './features/not-found/not-found.page';
import { OperatorAdminPage } from './features/operators/operator-admin.page';
import { AuditLogDetailPage } from './features/audit/audit-log-detail.page';
import { AuditLogListPage } from './features/audit/audit-log-list.page';
import { ProviderDetailsPage } from './features/providers/provider-details.page';
import { ProviderQueuePage } from './features/providers/provider-queue.page';
import { AdminShellComponent } from './layout/admin-shell/admin-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Backoffice login',
    component: LoginPage,
    canActivate: [requireAnonymousAdminGuard]
  },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [requireAdminSessionGuard],
    children: [
      {
        path: '',
        title: 'Proxi Backoffice',
        component: DashboardPage
      },
      {
        path: 'providers',
        title: 'Provider queue',
        component: ProviderQueuePage
      },
      {
        path: 'providers/:id',
        title: 'Provider review',
        component: ProviderDetailsPage
      },
      {
        path: 'audit-logs',
        title: 'Audit log',
        component: AuditLogListPage,
        canActivate: [requireAdminRoleGuard(['ADMINISTRATOR'])]
      },
      {
        path: 'audit-logs/:id',
        title: 'Audit event detail',
        component: AuditLogDetailPage,
        canActivate: [requireAdminRoleGuard(['ADMINISTRATOR'])]
      },
      {
        path: 'operators',
        title: 'Operators',
        component: OperatorAdminPage,
        canActivate: [requireAdminRoleGuard(['ADMINISTRATOR'])]
      },
      {
        path: 'payments',
        title: 'Payments',
        component: DashboardPage
      },
      {
        path: 'moderation',
        title: 'Moderation',
        component: DashboardPage
      },
      {
        path: '**',
        title: 'Backoffice page not found',
        component: NotFoundPage
      }
    ]
  }
];
