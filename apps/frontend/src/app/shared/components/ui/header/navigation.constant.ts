import type { TgNavItem } from '@shared/design-system/navigation/tg-nav-item';
import { Roles, RolesBack } from '@shared/enums/roles.enum';

/**
 * Navegação do shell logado (docs/design-system/README.md, "Navegação"):
 * os mesmos destinos no web e no app, na mesma ordem, por modo.
 */
export interface ShellNavigation {
  /** Destino da marca: a home do modo. */
  readonly home: string;
  /** Destinos principais (no máximo quatro). */
  readonly destinations: readonly TgNavItem[];
  /** Aba da Conta, só abaixo de 1024 px. */
  readonly account: TgNavItem;
  /** Links do menu da conta (o "Sair da conta" vem do próprio menu). */
  readonly accountLinks: readonly TgNavItem[];
  /** Linha de apoio do menu da conta. */
  readonly roleLabel: string;
}

export function normalizeNavigationRole(
  role: Roles | RolesBack | string | undefined,
): RolesBack | null {
  if (role === Roles.CUSTOMER || role === RolesBack.CUSTOMER) return RolesBack.CUSTOMER;
  if (role === Roles.PROVIDER || role === RolesBack.PROVIDER) return RolesBack.PROVIDER;
  return null;
}

export function resolveShellNavigation(
  role: Roles | RolesBack | string | undefined,
  userId: string | undefined,
): ShellNavigation | null {
  const normalizedRole = normalizeNavigationRole(role);
  if (!normalizedRole || !userId) return null;

  const orders: TgNavItem = { label: 'Pedidos', icon: 'receipt', link: ['/general', userId, 'history'] };
  const account: TgNavItem = { label: 'Conta', icon: 'user-circle', link: ['/general', userId, 'home'] };
  const accountLinks: readonly TgNavItem[] = [
    { label: 'Dados pessoais', icon: 'user', link: ['/general', userId, 'profile'] },
    { label: 'Endereços', icon: 'map-pin', link: ['/general', userId, 'addresses'] },
  ];

  if (normalizedRole === RolesBack.PROVIDER) {
    return {
      home: '/provider',
      destinations: [
        { label: 'Agenda', icon: 'calendar-blank', link: '/provider', exact: true },
        orders,
        { label: 'Serviços', icon: 'wrench', link: '/provider/services' },
        { label: 'Ganhos', icon: 'wallet', link: '/provider/recebimentos' },
      ],
      account,
      accountLinks,
      roleLabel: 'Profissional',
    };
  }

  return {
    home: '/customer',
    destinations: [
      { label: 'Início', icon: 'house', link: '/customer', exact: true },
      { label: 'Buscar', icon: 'magnifying-glass', link: '/customer/search' },
      orders,
      { label: 'Favoritos', icon: 'heart', link: '/customer/favorites' },
    ],
    account,
    accountLinks,
    roleLabel: 'Cliente',
  };
}
