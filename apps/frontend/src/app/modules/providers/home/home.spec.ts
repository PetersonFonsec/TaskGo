import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ProviderHomePage } from './home';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

describe('ProviderHomePage', () => {
  let component: ProviderHomePage;
  let fixture: ComponentFixture<ProviderHomePage>;
  const order = {
    confirmOrder: jasmine.createSpy('confirmOrder'),
    cancelOrder: jasmine.createSpy('cancelOrder'),
    getOrderByProvider: jasmine.createSpy('getOrderByProvider'),
    updateOrderStatus: jasmine.createSpy('updateOrderStatus'),
  };

  beforeEach(async () => {
    order.confirmOrder.calls.reset();
    order.cancelOrder.calls.reset();
    order.getOrderByProvider.calls.reset();
    order.updateOrderStatus.calls.reset();
    order.getOrderByProvider.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ProviderHomePage],
      providers: [
        { provide: Order, useValue: order },
        {
          provide: UserLoggedService,
          useValue: { user: () => ({ user: { id: '17', name: 'João' } }) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept a request through the backend before updating its status', () => {
    order.confirmOrder.and.returnValue(of({}));

    component.updateRequestStatus(1, 'accepted');

    expect(order.confirmOrder).toHaveBeenCalledWith('1', '17');
    expect(component.requests().find(({ id }) => id === 1)?.status).toBe('accepted');
    expect(component.pendingCount()).toBe(2);
  });

  it('should decline a request through the backend', () => {
    order.cancelOrder.and.returnValue(of({}));

    component.updateRequestStatus(2, 'declined');

    expect(order.cancelOrder).toHaveBeenCalledWith('2', '17');
    expect(component.requests().find(({ id }) => id === 2)?.status).toBe('declined');
  });

  it('should keep the request pending when the backend rejects the operation', () => {
    order.confirmOrder.and.returnValue(throwError(() => ({
      error: { message: 'Pedido já respondido' },
    })));

    component.updateRequestStatus(1, 'accepted');

    expect(component.requests().find(({ id }) => id === 1)?.status).toBe('pending');
    expect(component.requestError()).toBe('Pedido já respondido');
  });

  it('should allow starting a service even when its scheduled date has passed', () => {
    order.updateOrderStatus.and.returnValue(of({}));
    component.activeOrders.set([{
      id: '42',
      clientName: 'Cliente',
      service: 'Reparo',
      scheduledFor: '2020-01-01T12:00:00.000Z',
      amount: 100,
      status: 'EM_DESLOCAMENTO',
      date: '01 jan.',
      time: '09:00',
    }]);

    component.updateActiveOrderStatus('42', 'EM_ANDAMENTO');

    expect(order.updateOrderStatus).toHaveBeenCalledWith('42', 'EM_ANDAMENTO');
    expect(component.activeOrders()[0].status).toBe('EM_ANDAMENTO');
  });
});
