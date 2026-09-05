import { Component, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { form, FormField, pattern, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { AlertComponent } from '@shared/components/ui/alert/alert.component';

class AddressForm {
  neighborhood = '';
  complement = '';
  cep = '';
  street = '';
  number = '';
  lat = 0;
  lng = 0;

  constructor(obj: Partial<AddressForm>) {
    Object.assign(this, obj);
  }
}

@Component({
  selector: 'app-address',
  imports: [
    InputTextComponent,
    ButtonComponent,
    ButtonBackComponent,
    FormField,
    AlertComponent
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address {
  #geolocalization = inject(Geolocalization);
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);

  protected readonly addressModel = signal(new AddressForm(this.#registerUser.user().address));
  protected readonly addressForm = form(this.addressModel, (path) => {
    required(path.cep, { message: 'Informe o CEP.' });
    pattern(path.cep, /^\d{8}$/, { message: 'Informe um CEP com 8 dígitos.' });
    required(path.street, { message: 'Informe a rua.' });
    required(path.number, { message: 'Informe o número.' });
    required(path.neighborhood, { message: 'Informe o bairro.' });
  });
  protected readonly error = signal('');
  protected readonly resolvingZipCode = signal(false);

  protected async getAddressByZipCode(): Promise<void> {
    const cep = this.addressModel().cep;
    if (this.addressForm.cep().invalid()) return;

    this.resolvingZipCode.set(true);
    this.error.set('');

    try {
      const result = await firstValueFrom(this.#geolocalization.getLatLngByCep(cep));
      this.addressModel.update((address) => ({
        ...address,
        neighborhood: result.neighborhood ?? result.raw?.district ?? address.neighborhood,
        street: result.street ?? result.raw?.street ?? address.street,
        lng: result.longitude ?? result.raw?.lng ?? address.lng,
        lat: result.latitude ?? result.raw?.lat ?? address.lat
      }));
    } catch (error: unknown) {
      const status = this.#statusFrom(error);
      if (status !== 404) {
        this.error.set(`Erro ao consultar CEP: ${cep}`);
        return;
      }

      this.error.set(`CEP não encontrado: ${cep}`);
      await this.#useCurrentPosition();
    } finally {
      this.resolvingZipCode.set(false);
    }
  }

  protected async saveAddress(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await submit(this.addressForm, async () => {
      this.#registerUser.addAddress(this.addressModel());
      await this.#liveAnnouncer.announce('Dados de endereço salvos com sucesso');
      await this.#router.navigateByUrl('/authenticate/register');
    });
  }

  async #useCurrentPosition(): Promise<void> {
    try {
      const position = await firstValueFrom(this.#geolocalization.getCurrentPosition());
      this.addressModel.update((address) => ({
        ...address,
        lat: position.latitude,
        lng: position.longitude
      }));
      this.error.set('');
    } catch {
      this.error.set('Não foi possível obter a posição do navegador.');
    }
  }

  #statusFrom(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'status' in error) {
      return typeof error.status === 'number' ? error.status : undefined;
    }
    return undefined;
  }
}
