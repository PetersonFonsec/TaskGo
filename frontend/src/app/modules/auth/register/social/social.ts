import { Component, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';

export class SocialForm {
  whatsapp = '';
  instagram = '';
  facebook = '';
  linkdin = '';

  constructor(obj: Partial<SocialForm>) {
    Object.assign(this, obj);
  }
}
@Component({
  selector: 'app-social',
  imports: [
    InputTextComponent,
    ButtonComponent,
    ButtonBackComponent,
    FormsModule
  ],
  templateUrl: './social.html',
  styleUrl: './social.scss',
})
export class Social {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);
  error = signal("");

  payload!: SocialForm;

  ngOnInit(): void {
    this.payload = new SocialForm(this.#registerUser.user().social);
  }

  saveSocial() {
    this.#registerUser.addSocial(this.payload);
    this.#liveAnnouncer.announce("Salvo dados pessoais com sucesso");
    this.#router.navigateByUrl('/authenticate/register');
  }
}
