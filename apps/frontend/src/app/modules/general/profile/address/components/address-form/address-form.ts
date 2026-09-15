import { Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { FormsModule } from '@angular/forms';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { IAddressEntity } from '@shared/service/address/address.model';

@Component({
  selector: 'app-address-form',
  imports: [InputTextComponent, FormsModule, ButtonComponent],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
})
export class AddressForm implements OnInit, OnDestroy {
  private readonly geolocalization = inject(Geolocalization);
  private cepRequest?: Subscription;
  private lastCep = '';
  readonly lookingUpCep = signal(false);
  readonly cepError = signal('');

  ngOnDestroy() {
    this.cepRequest?.unsubscribe();
  }

  onCepChange(value: string) {
    const cep = (value ?? '').replace(/\D/g, '');
    this.payload.cep = cep;
    if (cep === this.lastCep) return;
    this.lastCep = cep;
    this.cepRequest?.unsubscribe();
    this.lookingUpCep.set(false);
    this.cepError.set('');
    if (cep.length !== 8) return;

    this.payload.lat = 0;
    this.payload.lng = 0;
    const previousAddress = { ...this.payload };
    this.lookingUpCep.set(true);
    this.cepRequest = this.geolocalization.getAddressByCep(cep).subscribe({
      next: (address) => {
        const resolvedAddress = {
          street: address.street ?? '',
          neighborhood: address.neighborhood ?? '',
          city: address.city,
          state: address.state,
          country: 'Brasil',
        };
        for (const field of Object.keys(resolvedAddress) as (keyof typeof resolvedAddress)[]) {
          if (this.payload[field] === previousAddress[field]) {
            this.payload[field] = resolvedAddress[field];
          }
        }
        this.lookingUpCep.set(false);
      },
      error: (error) => {
        this.lookingUpCep.set(false);
        this.cepError.set(
          error?.status === 404
            ? 'CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.'
            : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
        );
      },
    });
  }

  initialAddress = input<IAddressEntity | null>(null);
  saving = input(false);
  cancel = output<void>();
  ngOnInit() {
    if (this.initialAddress()) {
      this.payload = { ...this.initialAddress()! };
      this.lastCep = this.payload.cep.replace(/\D/g, '');
    }
  }

  addressSubmit = output<IAddressEntity>();

  payload: IAddressEntity = {
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    cep: '',
    lat: 0,
    lng: 0,
  };

  createAddress() {
    if (
      !this.saving() &&
      !this.lookingUpCep() &&
      /^\d{8}$/.test(this.payload.cep.replace(/\D/g, ''))
    ) {
      this.addressSubmit.emit({ ...this.payload, cep: this.payload.cep.replace(/\D/g, '') });
    }
  }
}
