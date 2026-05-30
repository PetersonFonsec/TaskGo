import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule, NgModel } from '@angular/forms';
import { Router } from '@angular/router';

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
    FormsModule,
    AlertComponent
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address implements OnInit {
  #geolocalization = inject(Geolocalization);
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);

  payload!: AddressForm;
  error = signal<string>('');

  ngOnInit(): void {
    this.payload = new AddressForm(this.#registerUser.user().address);
  }

  getAddressByZipCode() {
    this.#geolocalization.getLatLngByCep(this.payload.cep)
      .subscribe({
        next: (res) => {
          this.payload.neighborhood = res.neighborhood ?? res.raw.district;
          this.payload.street = res.street ?? res.raw.street;
          this.payload.lng = res.longitude ?? res.raw.lng;
          this.payload.lat = res.latitude ?? res.raw.lat;
          this.error.set('');
        },
        error: (err) => {
          if (err?.status !== 404) {
            this.error.set('erro ao consultar CEP: ' + this.payload.cep);
            return;
          }

          this.error.set('CEP não encontrado: ' + this.payload.cep);
          this.#geolocalization.getCurrentPosition().subscribe({
            next: pos => {
              this.error.set('');
            },
            error: e => {
              console.error('não foi possível obter posição do navegador', e);
              this.error.set('não foi possível obter posição do navegador');
            }
          });
        }
      });
  }

  saveAddress() {
    this.#registerUser.addAddress(this.payload);
    this.#liveAnnouncer.announce("Salvo dados os dados de endereço com sucesso");
    this.#router.navigateByUrl('/authenticate/register');
  }
}
