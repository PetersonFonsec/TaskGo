import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { finalize } from 'rxjs';

import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgPasswordToggleComponent } from '@shared/design-system/field/tg-password-toggle.component';
import { UserRegister } from '@shared/service/users/user-register';
import { Utils } from '@shared/service/utils/utils.service';

/** Mesmo critério do input type="email": algo@dominio, sem espaços. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Destinos aceitos vindos dos e-mails de pedido. */
const RETURN_URL = /^\/orders\/[1-9]\d*(?:\/(?:review|confirm|payment|finish|report-problem))?$/;

export function emailError(value: string): string {
  const email = value.trim();
  if (!email) return 'Informe seu e-mail.';
  return EMAIL_PATTERN.test(email) ? '' : 'Informe um e-mail válido, como nome@email.com.';
}

/**
 * Entrar (Etapa 10). Os erros aparecem ao tocar "Entrar": o botão fica
 * sempre ativo, cada campo mostra o que falta e o foco vai para o primeiro
 * inválido. Durante o pedido o botão mostra loading e ignora novos toques.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink, TgAlertComponent, TgButtonComponent, TgFieldComponent, TgInputDirective, TgPasswordToggleComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  #liveAnnouncer = inject(LiveAnnouncer);
  #userRegister = inject(UserRegister);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #destroyRef = inject(DestroyRef);

  readonly email = signal('');
  readonly password = signal('');
  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly emailError = computed(() => (this.submitted() ? emailError(this.email()) : ''));
  readonly passwordError = computed(() => (this.submitted() && !this.password() ? 'Informe sua senha.' : ''));

  readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    // Foco no e-mail como antes, só no navegador e depois da hidratação.
    afterNextRender(() => this.emailInput()?.nativeElement.focus());
  }

  setValue(field: 'email' | 'password', event: Event) {
    this[field].set((event.target as HTMLInputElement).value);
  }

  login() {
    if (this.loading()) return;
    this.submitted.set(true);
    this.error.set('');

    if (this.emailError()) return this.emailInput()?.nativeElement.focus();
    if (this.passwordError()) return this.passwordInput()?.nativeElement.focus();

    this.loading.set(true);
    this.#userRegister
      .login({ email: this.email().trim(), password: this.password() })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: ({ user }) => {
          this.#liveAnnouncer.announce('Login realizado com sucesso');
          const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl');
          const destination = returnUrl && RETURN_URL.test(returnUrl) ? returnUrl : Utils.getRouteByRoleBack(user.type);
          this.#router.navigateByUrl(destination);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(loginErrorMessage(error));
        },
      });
  }
}

export function loginErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  const message: unknown = error.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}
