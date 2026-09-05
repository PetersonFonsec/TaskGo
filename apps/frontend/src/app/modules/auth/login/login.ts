import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import type { AuthLoginRequest } from '@taskgo/shared';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { AlertComponent } from '@shared/components/ui/alert/alert.component';
import { UserRegister } from '@shared/service/users/user-register';
import { Utils } from '@shared/service/utils/utils.service';

@Component({
  selector: 'app-login',
  imports: [
    InputTextComponent,
    ButtonComponent,
    RouterLink,
    FormField,
    AlertComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  #liveAnnouncer = inject(LiveAnnouncer);
  #userRegister = inject(UserRegister);
  #router = inject(Router);
  protected readonly error = signal('');
  protected readonly credentials = signal<AuthLoginRequest>({ email: '', password: '' });
  protected readonly loginForm = form(this.credentials, (path) => {
    required(path.email, { message: 'Informe o seu email.' });
    email(path.email, { message: 'Informe um email válido.' });
    required(path.password, { message: 'Informe a sua senha.' });
  });

  protected async login(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.error.set('');

    await submit(this.loginForm, {
      action: async () => {
        try {
          const { user } = await firstValueFrom(this.#userRegister.login(this.credentials()));
          await this.#liveAnnouncer.announce('Login realizado com sucesso');
          await this.#router.navigateByUrl(Utils.getRouteByRoleBack(user.type));
        } catch (error) {
          await this.#liveAnnouncer.announce('Houve um erro ao realizar login');
          this.error.set(this.#getErrorMessage(error));
        }
      },
      onInvalid: () => {
        void this.#liveAnnouncer.announce('Revise os campos destacados antes de entrar');
      }
    });
  }

  #getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'Não foi possível realizar o login. Tente novamente.';
  }
}
