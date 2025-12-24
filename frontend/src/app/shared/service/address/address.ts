import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { IAddressEntity, ResponseAddressList } from './address.model';

@Injectable({
  providedIn: 'root',
})
export class Address {
  readonly #urlBase = environment.url + '/address';
  readonly #http = inject(HttpClient);

  getAddress(userId: string) {
    return this.#http.get<ResponseAddressList>(`${this.#urlBase}?userId=${userId}`);
  }

  createAddress(payload: IAddressEntity) {
    return this.#http.post<ResponseAddressList>(`${this.#urlBase}`, payload);
  }
}
