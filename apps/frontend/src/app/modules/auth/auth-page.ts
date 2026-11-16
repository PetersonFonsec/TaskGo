import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { Roles } from '@shared/enums/roles.enum';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';

/** Rotas do cadastro: usam o tema do tipo de conta escolhido. */
export const ACCOUNT_THEME = 'accountTheme';

/**
 * Casca da autenticação (Etapa 10): o painel da marca e, ao lado, a tela da
 * rota filha (entrar, recuperar acesso, cadastro). Sem rota filha, a entrada:
 * "Entrar" e "Criar conta".
 *
 * O Angular reaproveita esta casca entre as rotas filhas, então o tema segue
 * a rota ativa a cada navegação, não só ao abrir: as rotas do cadastro
 * (`data.accountTheme`) usam o tipo de conta escolhido (`UserStorage.type`);
 * as demais (entrada, entrar, recuperar e nova senha), sempre o do cliente.
 * O tipo de conta só muda pela escolha no cadastro.
 */
@Component({
  selector: 'app-auth-page',
  imports: [RouterOutlet, RouterLink, TgButtonComponent, TgIconComponent],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage implements OnInit {
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #theme = inject(Theme);
  readonly #userStorage = inject(UserStorage);

  /** Há uma tela filha aberta (sem ela, aparece a entrada). */
  readonly hasChild = signal(false);
  readonly highlights = [
    'Profissionais avaliados por quem já contratou',
    'Pagamento pelo app, com Pix',
    'Acompanhe cada pedido do início ao fim',
  ];

  ngOnInit(): void {
    this.#applyTheme();
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#applyTheme());
  }

  #applyTheme(): void {
    let route = this.#route;
    while (route.firstChild) route = route.firstChild;
    const accountTheme = route.snapshot.data[ACCOUNT_THEME] === true;
    this.#theme.setTheme(accountTheme ? this.#userStorage.type() : Roles.CUSTOMER);
  }
}
