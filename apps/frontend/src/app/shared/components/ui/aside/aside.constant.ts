import {
  faArrowRightFromBracket,
  faLocationDot,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { Roles, RolesBack } from '@shared/enums/roles.enum';

export type NavigationMatch = 'exact' | 'prefix';
export type NavigationAction = 'logout';

interface NavigationItemBase {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly roles: readonly RolesBack[];
}

export interface NavigationLinkItem extends NavigationItemBase {
  readonly kind: 'link';
  readonly path: (userId: string) => readonly string[];
  readonly match: NavigationMatch;
}

export interface NavigationActionItem extends NavigationItemBase {
  readonly kind: 'action';
  readonly action: NavigationAction;
}

export type NavigationItem = NavigationLinkItem | NavigationActionItem;

export interface NavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

export type ResolvedNavigationItem =
  | (Omit<NavigationLinkItem, 'path'> & { readonly routerLink: readonly string[] })
  | NavigationActionItem;

export interface ResolvedNavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ResolvedNavigationItem[];
}

const AUTHENTICATED_ROLES = [RolesBack.CUSTOMER, RolesBack.PROVIDER] as const;

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    id: 'account',
    label: 'Minha conta',
    items: [
      {
        id: 'personal-data',
        label: 'Dados Pessoais',
        icon: faUser,
        roles: AUTHENTICATED_ROLES,
        kind: 'link',
        path: (userId) => ['/general', userId, 'profile'],
        match: 'prefix',
      },
      {
        id: 'addresses',
        label: 'Endereços',
        icon: faLocationDot,
        roles: AUTHENTICATED_ROLES,
        kind: 'link',
        path: (userId) => ['/general', userId, 'addresses'],
        match: 'exact',
      },
      {
        id: 'logout',
        label: 'Sair da Conta',
        icon: faArrowRightFromBracket,
        roles: AUTHENTICATED_ROLES,
        kind: 'action',
        action: 'logout',
      },
    ],
  },
] as const;

export function normalizeNavigationRole(role: Roles | RolesBack | string | undefined): RolesBack | null {
  if (role === Roles.CUSTOMER || role === RolesBack.CUSTOMER) {
    return RolesBack.CUSTOMER;
  }

  if (role === Roles.PROVIDER || role === RolesBack.PROVIDER) {
    return RolesBack.PROVIDER;
  }

  return null;
}

export function resolveNavigationGroups(
  role: Roles | RolesBack | string | undefined,
  userId: string | undefined,
): readonly ResolvedNavigationGroup[] {
  const normalizedRole = normalizeNavigationRole(role);
  if (!normalizedRole || !userId) {
    return [];
  }

  return NAVIGATION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items
      .filter((item) => item.roles.includes(normalizedRole))
      .map((item): ResolvedNavigationItem => {
        if (item.kind === 'action') {
          return item;
        }

        return {
          ...item,
          routerLink: item.path(userId),
        };
      }),
  })).filter((group) => group.items.length > 0);
}
