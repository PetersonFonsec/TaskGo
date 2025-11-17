import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { OrdersResponse } from './order.model';

@Injectable({
  providedIn: 'root'
})
export class Order {
  readonly #urlBase = environment.url + '/order';
  readonly #http = inject(HttpClient);

  getOrderByClient(clientId: string) {
    return this.#http.get<OrdersResponse>(`${this.#urlBase}/client/${clientId}`);
  }
}
