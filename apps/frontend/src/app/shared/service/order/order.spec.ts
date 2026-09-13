import { environment } from '@environments/environment';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Order } from './order';

describe('Order', () => {
  let service: Order;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Order);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('updates the selected order status without sending unrelated fields', () => {
    service.updateOrderStatus('order-1', 'CANCELED').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/order/order-1`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'CANCELED' });
    request.flush({});
  });
});
