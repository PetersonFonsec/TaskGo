import { EMPTY, expand, map, reduce } from 'rxjs';
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

  getAllAddresses(userId: string) {
    const page = (pageNumber: number) =>
      this.#http.get<ResponseAddressList>(`${this.#urlBase}?limit=100&page=${pageNumber}`);
    return page(1).pipe(
      expand((response) => (response.meta.hasNextPage ? page(response.meta.page + 1) : EMPTY)),
      map((response) => response.data),
      reduce((addresses, batch) => [...addresses, ...batch], [] as ResponseAddressList['data']),
    );
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
