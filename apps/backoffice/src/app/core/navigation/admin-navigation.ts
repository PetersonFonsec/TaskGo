import { AdminRole } from '@app/core/auth/admin-session.model';

export interface AdminNavigationItem {
  readonly label: string;
  readonly path: string;
  readonly capability: string;
  readonly roles: readonly AdminRole[];
}

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    capability: 'Provider dashboard',
    roles: ['ADMINISTRATOR', 'SUPPORT']
  },
  {
    label: 'Providers',
    path: '/providers',
    capability: 'Provider queue/details',
    roles: ['ADMINISTRATOR', 'SUPPORT']
  },
  {
    label: 'Audit log',
    path: '/audit-logs',
    capability: 'Audit log',
    roles: ['ADMINISTRATOR']
  },
  {
    label: 'Operators',
    path: '/operators',
    capability: 'Administrative users',
    roles: ['ADMINISTRATOR']
  },
  {
    label: 'Payments',
    path: '/payments',
    capability: 'Financial workflows',
    roles: ['FINANCE']
  },
  {
    label: 'Moderation',
    path: '/moderation',
    capability: 'Service, category, and review moderation',
    roles: ['MODERATOR']
  }
];

export function navigationForRole(role: AdminRole): readonly AdminNavigationItem[] {
  return ADMIN_NAVIGATION.filter((item) => item.roles.includes(role));
}
