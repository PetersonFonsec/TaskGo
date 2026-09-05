import { Component, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { Router } from '@angular/router';

export class ProfileForm {
  confirmPassword = '';
  password = '';
  email = '';
  phone = '';
  name = '';
  cpf = '';

  constructor(obj: Partial<ProfileForm>) {
    Object.assign(this, obj);
  }
}

@Component({
  selector: 'app-profile',
  imports: [FormField, InputTextComponent, ButtonComponent, ButtonBackComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);
  protected readonly profileModel = signal(new ProfileForm(this.#registerUser.user()));
  protected readonly profileForm = form(this.profileModel, (path) => {
    required(path.name, { message: 'Informe o seu nome.' });
    required(path.phone, { message: 'Informe o seu telefone.' });
    required(path.email, { message: 'Informe o seu email.' });
    email(path.email, { message: 'Informe um email válido.' });
    required(path.password, { message: 'Informe a sua senha.' });
    required(path.confirmPassword, { message: 'Confirme a sua senha.' });
    validate(path.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(path.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'As senhas precisam ser iguais.' }
    );
    required(path.cpf, { message: 'Informe o seu CPF.' });
  });

  protected async saveProfile(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await submit(this.profileForm, async () => {
      const { confirmPassword: _, ...personalInfo } = this.profileModel();
      this.#registerUser.addPersonalInfo(personalInfo);
      await this.#liveAnnouncer.announce('Dados pessoais salvos com sucesso');
      await this.#router.navigateByUrl('/authenticate/register');
    });
  }
}
