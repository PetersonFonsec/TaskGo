import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Page } from '@shared/components/ui/page/page';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { normalizeNavigationRole } from '@shared/components/ui/header/navigation.constant';
import { UrlBase } from '@shared/enums/base-url.enum';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';

/**
 * Página 404 (rota curinga). Vale para visitante, cliente e prestador: o
 * "Ir para o início" leva ao início de quem está na sessão, com a mesma
 * regra do `userLoggedGuard` (token e tipo de usuário: `/customer` ou
 * `/provider`); sem sessão, à entrada (`/authenticate`). O tema segue o
 * modo de quem está na sessão, como no shell logado.
 */
@Component({
  selector: 'app-not-found',
  imports: [Page, RouterLink, TgButtonComponent, TgEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly #router = inject(Router);
  readonly #location = inject(Location);
  readonly #token = inject(TokenService);
  readonly #session = inject(UserLoggedService);

  /** Papel de quem está na sessão (com token), ou null para visitante. */
  readonly role = computed(() => {
    const role = normalizeNavigationRole(this.#session.user()?.user?.type);
    return role && this.#token.token ? role : null;
  });

  /** Início de quem está na sessão; a entrada, para visitante. */
  readonly home = computed(() => {
    const role = this.role();
    return role ? Utils.getRouteByRoleBack(role) : `/${UrlBase.AUTHENTICATE}`;
  });

  /** Volta para a tela anterior do app; aberta direto pelo endereço, vai ao início. */
  back(): void {
    if (this.#router.lastSuccessfulNavigation()?.previousNavigation) {
      this.#location.back();
      return;
    }
    void this.#router.navigateByUrl(this.home());
  }
}
