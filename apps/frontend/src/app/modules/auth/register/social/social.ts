import { Component, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { form, FormField, submit } from '@angular/forms/signals';
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
    FormField
  ],
  templateUrl: './social.html',
  styleUrl: './social.scss',
})
export class Social {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);
  protected readonly socialModel = signal(new SocialForm(this.#registerUser.user().social));
  protected readonly socialForm = form(this.socialModel);

  protected async saveSocial(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await submit(this.socialForm, async () => {
      this.#registerUser.addSocial(this.socialModel());
      await this.#liveAnnouncer.announce('Redes sociais salvas com sucesso');
      await this.#router.navigateByUrl('/authenticate/register');
    });
  }
}
