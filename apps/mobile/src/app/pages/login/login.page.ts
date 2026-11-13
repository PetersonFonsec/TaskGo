import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';

import { AuthService, ProviderAccountError } from '@app/core/auth/auth.service';
import { PushRegistrationService } from '@app/core/push/push-registration.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonInputPasswordToggle,
    IonList,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './login.page.html'
})
export class LoginPage {
  readonly #auth = inject(AuthService);
  readonly #push = inject(PushRegistrationService);
  readonly #router = inject(Router);

  /** Para onde voltar depois do login (?voltar=/...). */
  readonly voltar = input<string>();

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, trimmedEmail]],
    password: ['', Validators.required]
  });
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.#auth.login(email.trim(), password);
    } catch (error) {
      this.error.set(loginErrorMessage(error));
      this.submitting.set(false);
      return;
    }
    // O pedido de permissão não pode travar a entrada no app.
    void this.#push.enable().catch(() => undefined);
    this.submitting.set(false);
    await this.#router.navigateByUrl(safeReturnUrl(this.voltar()), { replaceUrl: true });
  }
}

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ProviderAccountError) {
    return 'Este app é para quem contrata serviços. Prestadores usam o TaskGo pelo site.';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Sem conexão com o TaskGo. Verifique sua internet.';
    if (error.status === 400 || error.status === 401 || error.status === 404) {
      return 'E-mail ou senha incorretos.';
    }
    if (error.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  }
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

/** Teclados de celular costumam deixar um espaço no fim do e-mail. */
function trimmedEmail(control: AbstractControl<string>): ValidationErrors | null {
  return Validators.email({ value: control.value.trim() } as AbstractControl);
}

/** Aceita só caminhos internos, para o parâmetro não virar um redirecionamento aberto. */
export function safeReturnUrl(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
