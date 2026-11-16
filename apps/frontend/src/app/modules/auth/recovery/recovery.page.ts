import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgPasswordToggleComponent } from '@shared/design-system/field/tg-password-toggle.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { emailError } from '../login/login';

/** Regra do backend para a nova senha. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

export function newPasswordError(value: string): string {
  if (!value) return 'Informe a nova senha.';
  if (value.length < PASSWORD_MIN) return `Use pelo menos ${PASSWORD_MIN} caracteres.`;
  if (value.length > PASSWORD_MAX) return `Use no máximo ${PASSWORD_MAX} caracteres.`;
  return '';
}

/**
 * Recuperar acesso e Criar nova senha (Etapa 10), na mesma tela:
 * `forgot-password` pede o link por e-mail; `reset-password` (data.reset)
 * troca a senha com o token que chega no fragmento (#token=...).
 * Erros de preenchimento aparecem ao enviar, como em Entrar.
 */
@Component({
  selector: 'app-recovery',
  imports: [RouterLink, TgAlertComponent, TgButtonComponent, TgFieldComponent, TgIconComponent, TgInputDirective, TgPasswordToggleComponent],
  templateUrl: './recovery.page.html',
  styleUrl: './recovery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryPage {
  readonly #http = inject(HttpClient);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  readonly resetMode = this.#route.snapshot.data['reset'] === true;
  readonly token = new URLSearchParams(this.#route.snapshot.fragment ?? '').get('token') ?? '';

  readonly email = signal('');
  readonly password = signal('');
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  /** E-mail para o qual o link foi pedido; preenchido, a tela mostra a confirmação. */
  readonly sentTo = signal('');
  readonly passwordSaved = signal(false);

  readonly emailError = computed(() => (this.submitted() ? emailError(this.email()) : ''));
  readonly passwordError = computed(() => (this.submitted() ? newPasswordError(this.password()) : ''));

  readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  setValue(field: 'email' | 'password', event: Event) {
    this[field].set((event.target as HTMLInputElement).value);
  }

  submit() {
    if (this.busy()) return;
    this.submitted.set(true);
    this.error.set('');
    if (this.resetMode ? this.passwordError() : this.emailError()) {
      this.field()?.nativeElement.focus();
      return;
    }

    const email = this.email().trim();
    this.busy.set(true);
    this.#http
      .post<{ message: string }>(
        environment.url + (this.resetMode ? '/auth/reset-password' : '/auth/forget'),
        this.resetMode ? { token: this.token, password: this.password() } : { email },
      )
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.resetMode) {
            this.password.set('');
            this.passwordSaved.set(true);
          } else {
            this.sentTo.set(email);
          }
        },
        error: (error: HttpErrorResponse) => this.error.set(recoveryErrorMessage(error)),
      });
  }
}

export function recoveryErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  const message: unknown = error.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}
