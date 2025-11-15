import { Component, inject, OnInit, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';

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
  imports: [FormsModule, InputTextComponent, ButtonComponent, ButtonBackComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);
  error = signal("");

  payload!: ProfileForm;

  ngOnInit(): void {
    this.payload = new ProfileForm(this.#registerUser.user());
  }

  saveProfile() {
    this.#registerUser.addPersonalInfo(this.payload);
    this.#liveAnnouncer.announce("Salvo dados pessoais com sucesso");
    this.#router.navigateByUrl('/authenticate/register');
  }
}
