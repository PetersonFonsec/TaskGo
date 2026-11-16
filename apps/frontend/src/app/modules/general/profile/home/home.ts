import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TgIconName } from '@taskgo/icons';

import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

export interface AccountLink {
  readonly label: string;
  readonly description: string;
  readonly icon: TgIconName;
  /** Relativo a /general/:userId/home. */
  readonly link: string;
}

/** Só rotas que existem em GeneralRoutes. */
export const ACCOUNT_LINKS: readonly AccountLink[] = [
  { label: 'Dados pessoais', description: 'Nome, contato e foto.', icon: 'user', link: '../profile' },
  { label: 'Endereços', description: 'Onde os serviços acontecem.', icon: 'map-pin', link: '../addresses' },
];

/**
 * Conta (destino da aba "Conta" abaixo de 1024 px): os mesmos links do menu
 * da conta da barra do topo e o "Sair da conta", separado dos links.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, TgButtonComponent, TgCardComponent, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly #session = inject(UserLoggedService);

  protected readonly links = ACCOUNT_LINKS;

  protected signOut(): void {
    this.#session.logout();
  }
}
