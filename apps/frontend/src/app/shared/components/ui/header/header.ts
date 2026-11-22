import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TgAccountMenuComponent } from '@shared/design-system/navigation/tg-account-menu.component';
import { TgAppBarComponent } from '@shared/design-system/navigation/tg-app-bar.component';
import { TgNavComponent } from '@shared/design-system/navigation/tg-nav.component';
import { Notification } from '@shared/components/functional/notification/notification';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { resolveShellNavigation } from './navigation.constant';

/**
 * Topo do shell logado no Design System: marca TaskGo, destinos do modo
 * (barra de abas embaixo, abaixo de 1024 px) e menu da conta com o nome, a
 * foto e o modo de quem está na sessão, com acesso às notificações.
 */
@Component({
  selector: 'app-header',
  imports: [TgAccountMenuComponent, TgAppBarComponent, TgNavComponent, Notification],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly #session = inject(UserLoggedService);

  protected readonly user = computed(() => this.#session.user()?.user);
  protected readonly navigation = computed(() => {
    const user = this.user();
    return resolveShellNavigation(user?.type, user?.id);
  });
  protected readonly name = computed(() => this.user()?.name?.trim() || 'Sua conta');
  protected readonly photo = computed(() => this.user()?.photoUrl || null);

  protected signOut(): void {
    this.#session.logout();
  }
}
