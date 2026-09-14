import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { IAddressEntity, ResponseAddressList } from './address.model';

@Injectable({
  providedIn: 'root',
})
export class Address {
  readonly #urlBase = environment.url + '/user/me/addresses';
  readonly #http = inject(HttpClient);

  getAddress(userId: string, limit = 3) {
    return this.#http.get<ResponseAddressList>(`${this.#urlBase}?limit=${limit}`);
  }

  createAddress(payload: IAddressEntity) {
    const { label, street, number, complement, city, state, cep, lat, lng, isDefault } = payload;
    return this.#http.post<ResponseAddressList>(`${this.#urlBase}`, {
      label,
      street,
      number,
      complement,
      city,
      state,
      cep,
      lat,
      lng,
      isDefault,
    });
  }
}
