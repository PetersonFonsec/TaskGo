import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Footer } from '@shared/components/ui/footer/footer';
import { resolveShellNavigation } from '@shared/components/ui/header/navigation.constant';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgAppBarComponent } from '@shared/design-system/navigation/tg-app-bar.component';
import { UrlBase } from '@shared/enums/base-url.enum';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { INSTITUTIONAL_PAGES, institutionalLink } from './institutional-pages';

/**
 * Casca das páginas institucionais (Etapa 10): a mesma barra do topo e o
 * mesmo rodapé do app, mas sem os destinos nem o menu da conta (as rotas
 * institucionais ficam fora do shell logado). Quem visita vê "Entrar"; quem
 * está logado, "Voltar ao app", e o tema do seu modo. Ao lado do texto, a
 * navegação entre os quatro documentos.
 */
@Component({
  selector: 'app-institutional-page',
  imports: [
    Footer,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TgAppBarComponent,
    TgButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institutional-page.html',
  styleUrl: './institutional-page.scss',
})
export class InstitutionalPage {
  readonly #session = inject(UserLoggedService);

  readonly #user = computed(() => this.#session.user()?.user);
  /** Destinos do modo de quem está logado; `null` para visitante. */
  protected readonly navigation = computed(() => {
    const user = this.#user();
    return resolveShellNavigation(user?.type, user?.id);
  });
  protected readonly home = computed(() => this.navigation()?.home ?? `/${UrlBase.AUTHENTICATE}`);
  protected readonly signIn = `/${UrlBase.AUTHENTICATE}`;
  protected readonly pages = INSTITUTIONAL_PAGES.map((page) => ({
    ...page,
    link: institutionalLink(page.path),
  }));
}
