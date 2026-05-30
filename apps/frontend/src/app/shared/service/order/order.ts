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

  getOrderByProvider(providerId: string) {
    return this.#http.get<OrdersResponse>(`${this.#urlBase}/provider/${providerId}`);
  }

  getOrderSumary(orderId: string) {
    return this.#http.get<any>(`${this.#urlBase}/${orderId}/summary`);
  }

  confirmOrder(orderId: string, providerId: string) {
    return this.#http.post<any>(`${this.#urlBase}/${orderId}/provider/${providerId}/confirm`, {});
  }

  cancelOrder(orderId: string, providerId: string) {
    return this.#http.post<any>(`${this.#urlBase}/${orderId}/provider/${providerId}/cancel`, {});
  }
}
