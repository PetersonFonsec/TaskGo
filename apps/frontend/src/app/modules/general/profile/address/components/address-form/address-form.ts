import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { IAddressEntity } from '@shared/service/address/address.model';

@Component({
  selector: 'app-address-form',
  imports: [
    InputTextComponent,
    FormsModule,
    ButtonComponent
  ],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
})
export class AddressForm {
  submit = output<IAddressEntity>();

  payload: IAddressEntity = {
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: '',
    cep: '',
    lat: 0,
    lng: 0,
  };

  createAddress() {
    this.submit.emit(this.payload);
  }
}
