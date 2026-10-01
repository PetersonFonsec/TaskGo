import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Order } from '@shared/service/order/order';
import { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { OrderDetailsPage } from './order-details.page';

const cancelledOrder: OrderDetails = {
  id: '5',
  status: 'CANCELADO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
  provider: { id: '17', name: 'João', photoUrl: null, ratingAvg: 4.8, ratingCount: 3 },
  client: { id: '7', name: 'Maria', photoUrl: null },
  schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: null },
  address: null,
  cancellation: {
    reason: 'NO_AVAILABILITY',
    label: 'Sem horário disponível',
    note: 'Agenda cheia nesta semana',
    canceledAt: '2026-10-01T11:00:00.000Z',
  },
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
};

describe('OrderDetailsPage', () => {
  let fixture: ComponentFixture<OrderDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailsPage],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: { getOrderDetails: () => of(cancelledOrder) } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '5' })) },
        },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { type: 'CUSTOMER' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailsPage);
    fixture.detectChanges();
  });

  it('shows the client why the provider declined the order', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('O prestador não pôde atender este pedido');
    expect(text).toContain('Motivo: Sem horário disponível');
    expect(text).toContain('Agenda cheia nesta semana');
  });
});
