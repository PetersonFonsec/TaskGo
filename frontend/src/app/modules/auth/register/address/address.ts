import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';

@Component({
  selector: 'app-address',
  imports: [
    InputTextComponent,
    ButtonComponent,
    ButtonBackComponent,
    FormsModule
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address {
  #geolocalization = inject(Geolocalization);
  payload = {} as any;

  getLatLngByCep() {
    this.#geolocalization.getLatLngByCep('09854-560')
      .subscribe({
        next: loc => console.log('LatLng', loc),
        error: err => {
          if (err?.status === 404) {
            // pedir permissão para pegar localização atual
            this.#geolocalization.getCurrentPosition().subscribe((res) => {
              console.log('LatLng', res)
            });
          } else {
            console.error(err);
          }
        }
      });
  }

  saveAddress() {

  }
}
