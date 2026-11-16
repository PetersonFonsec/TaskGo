import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { mobileError } from '../register-validation';

/** Instagram sem o @ na tela (o @ é o prefixo do campo) e com o @ no rascunho. */
export const instagramHandle = (value: string) => value.trim().replace(/^@+/, '');

/** Passo 2 do cadastro: contato e redes, tudo opcional. */
@Component({
  selector: 'app-social',
  imports: [FormsModule, NgxMaskDirective, RouterLink, TgButtonComponent, TgFieldComponent, TgIconComponent, TgInputDirective],
  providers: [provideNgxMask()],
  templateUrl: './social.html',
  styles: ':host { display: block; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Social {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);

  readonly #draft = this.#registerUser.user().social;
  readonly whatsapp = signal(this.#draft.whatsapp);
  readonly instagram = signal(instagramHandle(this.#draft.instagram));
  readonly facebook = signal(this.#draft.facebook);
  readonly linkedin = signal(this.#draft.linkdin);
  readonly submitted = signal(false);

  readonly whatsappError = computed(() => (this.submitted() ? mobileError(this.whatsapp(), true) : ''));
  readonly whatsappInput = viewChild<ElementRef<HTMLInputElement>>('whatsappInput');

  /** O @ já é o prefixo do campo: colar ou digitar "@perfil" guarda só "perfil". */
  handle(value: string) {
    return instagramHandle(value ?? '');
  }

  saveSocial() {
    this.submitted.set(true);
    if (this.whatsappError()) {
      this.whatsappInput()?.nativeElement.focus();
      return;
    }
    const instagram = instagramHandle(this.instagram());
    this.#registerUser.addSocial({
      whatsapp: this.whatsapp(),
      instagram: instagram ? `@${instagram}` : '',
      facebook: this.facebook().trim(),
      linkdin: this.linkedin().trim(),
    });
    this.#liveAnnouncer.announce('Contato salvo');
    this.#router.navigateByUrl('/authenticate/register');
  }
}
