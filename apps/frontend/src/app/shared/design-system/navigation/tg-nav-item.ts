import type { TgIconName } from '@taskgo/icons';

/** Um destino da navegação: rótulo sempre visível, ícone e link do router. */
export interface TgNavItem {
  readonly label: string;
  readonly icon: TgIconName;
  readonly link: string | readonly unknown[];
  /** Só fica atual com a rota exata (útil para a home). Padrão: prefixo. */
  readonly exact?: boolean;
}
