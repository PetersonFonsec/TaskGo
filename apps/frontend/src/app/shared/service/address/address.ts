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

  removeAddress(id: string) {
    return this.#http.delete(`${this.#urlBase}/${id}`);
  }

  updateAddress(id: string, payload: IAddressEntity) {
    return this.#http.patch(`${this.#urlBase}/${id}`, this.toPayload(payload));
  }

  createAddress(payload: IAddressEntity) {
    return this.#http.post(this.#urlBase, this.toPayload(payload));
  }

  private toPayload(payload: IAddressEntity) {
    const { label, street, number, complement, city, state, cep, lat, lng, isDefault } = payload;
    return {
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
    };
  }
}
