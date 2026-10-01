import { of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Order } from '@shared/service/order/order';
import { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { PendingApproval } from './pending-approval';

const details = (): OrderDetails => ({
  id: '5',
  status: 'AGUARDANDO_APROVACAO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
  provider: { id: '17', name: 'João', photoUrl: null },
  client: { id: '7', name: 'Maria', photoUrl: null },
  schedule: {
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    scheduledFor: '2026-10-03T13:00:00.000Z',
    scheduledEnd: '2026-10-03T15:00:00.000Z',
  },
  address: {
    street: 'Rua das Flores',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000-000',
  },
  distanceKm: 3.2,
  providerEarnings: { grossAmount: 150, feePct: 0.12, feeAmount: 18, netAmount: 132 },
  cancellation: null,
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
});

describe('PendingApproval', () => {
  let component: PendingApproval;
  let fixture: ComponentFixture<PendingApproval>;
  let order: jasmine.SpyObj<Order>;
  let queryParams: Record<string, string>;

  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [PendingApproval],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: order },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ orderId: '5' }),
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
          },
        },
        {
          provide: UserLoggedService,
          useValue: { user: () => ({ user: { id: '17', type: 'PROVIDER' } }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingApproval);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    queryParams = {};
    order = jasmine.createSpyObj<Order>('Order', [
      'getOrderDetails',
      'confirmOrder',
      'cancelOrder',
    ]);
    order.getOrderDetails.and.returnValue(of(details()));
    order.confirmOrder.and.returnValue(of({}));
    order.cancelOrder.and.returnValue(of({}));
  });

  it('shows schedule, address, distance, values and when the request arrived', async () => {
    await create();
    expect(order.getOrderDetails).toHaveBeenCalledWith('5');
    const content = text();
    expect(content).toContain('Instalação de chuveiro');
    expect(content).toContain('recebida há 2 h');
    expect(content).toContain(component.formatDate('2026-10-03T13:00:00.000Z'));
    expect(content).toContain(
      component.formatTimeRange('2026-10-03T13:00:00.000Z', '2026-10-03T15:00:00.000Z'),
    );
    expect(content).toContain('Rua das Flores, 10');
    expect(content).toContain('Centro · São Paulo/SP · CEP 01000-000');
    expect(content).toContain('3,2 km');
    expect(content).toContain(component.formatMoney(150));
    expect(content).toContain(component.formatMoney(132));
    expect(content).toContain('12%');
  });

  it('does not show client contact data', async () => {
    await create();
    expect(text()).not.toMatch(/telefone|e-?mail/i);
  });

  it('shows an error state and retries loading', async () => {
    order.getOrderDetails.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await create();
    expect(text()).toContain('Não foi possível carregar a solicitação');

    order.getOrderDetails.and.returnValue(of(details()));
    component.load();
    fixture.detectChanges();
    expect(text()).toContain('Instalação de chuveiro');
  });

  it('accepts the request', async () => {
    await create();
    component.confirm();
    expect(order.confirmOrder).toHaveBeenCalledWith('5', '17');
    expect(component.showModal()).toBeTrue();
  });

  it('requires a reason before declining', async () => {
    await create();
    component.openDecline();
    component.decline();
    expect(order.cancelOrder).not.toHaveBeenCalled();
    expect(component.actionError()).toContain('motivo');
  });

  it('declines with the chosen reason and optional note', async () => {
    queryParams = { recusar: '1' };
    await create();
    expect(component.declining()).toBeTrue();
    expect(text()).toContain('Fora da minha área de atendimento');

    component.reason.set('OTHER');
    component.note.set('  Estarei viajando  ');
    component.decline();
    expect(order.cancelOrder).toHaveBeenCalledWith('5', '17', {
      reason: 'OTHER',
      note: 'Estarei viajando',
    });
    expect(component.showModal()).toBeTrue();
  });

  it('omits empty notes', async () => {
    await create();
    component.reason.set('NO_AVAILABILITY');
    component.decline();
    expect(order.cancelOrder).toHaveBeenCalledWith('5', '17', { reason: 'NO_AVAILABILITY' });
  });

  it('shows an error when the answer fails', async () => {
    order.confirmOrder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    await create();
    component.confirm();
    expect(component.showModal()).toBeFalse();
    expect(component.actionError()).toContain('não pode mais ser respondida');
    expect(component.submitting()).toBeFalse();
  });

  it('hides the actions for requests already answered', async () => {
    order.getOrderDetails.and.returnValue(of({ ...details(), status: 'CANCELADO' }));
    await create();
    expect(text()).toContain('Esta solicitação já foi respondida');
    expect(text()).not.toContain('Aceitar serviço');
  });
});
