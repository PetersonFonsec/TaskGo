import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgPasswordToggleComponent } from '@shared/design-system/field/tg-password-toggle.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { emailError } from '../../login/login';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../recovery/recovery.page';
import { cpfError, focusFirstInvalid, mobileError, passwordError, requiredError } from '../register-validation';

type ProfileField = 'name' | 'email' | 'phone' | 'cpf' | 'password' | 'confirmPassword';

/** Passo 1 do cadastro: dados de acesso e de contato. Erros ao enviar, como em Entrar. */
@Component({
  selector: 'app-profile',
  imports: [FormsModule, NgxMaskDirective, RouterLink, TgButtonComponent, TgFieldComponent, TgIconComponent, TgInputDirective, TgPasswordToggleComponent],
  providers: [provideNgxMask()],
  templateUrl: './profile.html',
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);

  readonly passwordMin = PASSWORD_MIN;
  readonly #draft = this.#registerUser.user();
  readonly name = signal(this.#draft.name);
  readonly email = signal(this.#draft.email);
  readonly phone = signal(this.#draft.phone);
  readonly cpf = signal(this.#draft.cpf);
  readonly password = signal(this.#draft.password);
  // Quem volta ao passo já tinha confirmado a senha salva.
  readonly confirmPassword = signal(this.#draft.password);
  readonly submitted = signal(false);

  readonly errors = computed<Record<ProfileField, string>>(() => {
    if (!this.submitted()) return { name: '', email: '', phone: '', cpf: '', password: '', confirmPassword: '' };
    const confirm = this.confirmPassword();
    return {
      name: requiredError(this.name(), 'Informe seu nome completo.'),
      email: emailError(this.email()),
      phone: mobileError(this.phone()),
      cpf: cpfError(this.cpf()),
      password: passwordError(this.password(), PASSWORD_MIN, PASSWORD_MAX),
      confirmPassword: !confirm ? 'Repita a senha.' : confirm !== this.password() ? 'As senhas não são iguais.' : '',
    };
  });

  readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');
  readonly cpfInput = viewChild<ElementRef<HTMLInputElement>>('cpfInput');
  readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  readonly confirmInput = viewChild<ElementRef<HTMLInputElement>>('confirmInput');

  saveProfile() {
    this.submitted.set(true);
    const errors = this.errors();
    const invalid = focusFirstInvalid([
      { error: errors.name, element: this.nameInput()?.nativeElement },
      { error: errors.email, element: this.emailInput()?.nativeElement },
      { error: errors.phone, element: this.phoneInput()?.nativeElement },
      { error: errors.cpf, element: this.cpfInput()?.nativeElement },
      { error: errors.password, element: this.passwordInput()?.nativeElement },
      { error: errors.confirmPassword, element: this.confirmInput()?.nativeElement },
    ]);
    if (invalid) return;

    this.#registerUser.addPersonalInfo({
      name: this.name().trim(),
      email: this.email().trim(),
      phone: this.phone(),
      cpf: this.cpf(),
      password: this.password(),
    });
    this.#liveAnnouncer.announce('Perfil salvo');
    this.#router.navigateByUrl('/authenticate/register');
  }
}
