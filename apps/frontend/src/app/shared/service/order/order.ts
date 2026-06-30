import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { ConfirmOrderResponse, FinishOrderPayload, FinishOrderResponse, OrderDetails, OrdersResponse, ReviewRequest, ReviewResponse } from './order.model';

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

  getOrderDetails(orderId: string) {
    return this.#http.get<OrderDetails>(`${environment.url}/orders/${orderId}`);
  }

  updateOrderStatus(orderId: string, status: string) {
    return this.#http.patch<OrderDetails>(`${this.#urlBase}/${orderId}`, { status });
  }

  finishOrder(orderId: string, payload: FinishOrderPayload) {
    return this.#http.patch<FinishOrderResponse>(`${environment.url}/orders/${orderId}/finish`, payload);
  }

  confirmOrderCompletion(orderId: string, clientNotes?: string) {
    return this.#http.patch<ConfirmOrderResponse>(`${environment.url}/orders/${orderId}/confirm`, { clientNotes });
  }

  createReview(orderId: string, payload: ReviewRequest) {
    return this.#http.post<ReviewResponse>(`${environment.url}/orders/${orderId}/review`, payload);
  }

  confirmOrder(orderId: string, providerId: string) {
    return this.#http.post<any>(`${this.#urlBase}/${orderId}/provider/${providerId}/confirm`, {});
  }

  cancelOrder(orderId: string, providerId: string) {
    return this.#http.post<any>(`${this.#urlBase}/${orderId}/provider/${providerId}/cancel`, {});
  }
}
