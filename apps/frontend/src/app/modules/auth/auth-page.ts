import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { Roles } from '@shared/enums/roles.enum';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';

/**
 * Casca da autenticação (Etapa 10): o painel da marca e, ao lado, a tela da
 * rota filha (entrar, recuperar acesso, cadastro). Sem rota filha, a entrada:
 * "Entrar" e "Criar conta". Abre sempre no tema do cliente; a escolha de
 * profissional acontece no cadastro, que troca o tema.
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
    this.#theme.setTheme(Roles.CUSTOMER);
    // O cadastro troca o tema ao escolher "Profissional"; o tipo da conta segue o tema.
    this.#theme.change
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((role) => this.#userStorage.type.set(role));
  }

  /** "Criar conta" na entrada: o cadastro começa como cliente. */
  startRegister(): void {
    this.#theme.setTheme(Roles.CUSTOMER);
  }
}
