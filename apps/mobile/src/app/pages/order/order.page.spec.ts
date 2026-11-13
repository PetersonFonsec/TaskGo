import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { OrderDetails } from '@app/core/orders/orders.models';
import { OrdersService } from '@app/core/orders/orders.service';
import { OrderPage } from './order.page';

const details: OrderDetails = {
  id: '99',
  status: 'AGUARDANDO_PAGAMENTO',
  service: { id: '1', title: 'Troca de chuveiro', estimatedPrice: 150 },
  provider: { id: '10', name: 'Carlos Lima', photoUrl: null, ratingAvg: 4.8, ratingCount: 12, verified: true },
  schedule: { requestedAt: '2026-11-13T12:00:00.000Z', scheduledFor: '2026-11-15T13:00:00.000Z' },
  address: { street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Diadema', state: 'SP' },
  cancellation: null,
  payment: { status: 'CREATED', estimatedAmount: 150, finalAmount: null },
  timeline: [
    { type: 'REQUESTED', title: 'Solicitação enviada', description: 'O cliente solicitou o atendimento.', date: '2026-11-13T12:00:00.000Z' },
    { type: 'ACCEPTED', title: 'Prestador aceitou', date: '2026-11-13T12:30:00.000Z' }
  ]
};

describe('OrderPage', () => {
  async function render(details$: ReturnType<OrdersService['details']>) {
    const service = { details: jasmine.createSpy('details').and.returnValue(details$) };
    TestBed.configureTestingModule({
      imports: [OrderPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: service }
      ]
    });
    const fixture = TestBed.createComponent(OrderPage);
    fixture.componentRef.setInput('id', '99');
    await stable(fixture);
    return { fixture, service };
  }

  async function stable(fixture: ComponentFixture<OrderPage>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (fixture: ComponentFixture<OrderPage>) =>
    (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('shows the status, what happens next, the details and the timeline', async () => {
    const { fixture, service } = await render(of(details));
    expect(service.details).toHaveBeenCalledWith('99');
    expect(text(fixture)).toContain('Aguardando pagamento');
    expect(text(fixture)).toContain('faça o pagamento por PIX no site');
    expect(text(fixture)).toContain('Carlos Lima');
    expect(text(fixture)).toContain('Rua A, 10 · Centro · Diadema/SP');
    expect(text(fixture)).toContain('R$ 150,00');
    expect(text(fixture)).toContain('Solicitação enviada');
    expect(text(fixture)).toContain('Prestador aceitou');
  });

  it('shows the final amount and the cancellation reason when there is one', async () => {
    const { fixture } = await render(
      of({
        ...details,
        status: 'CANCELADO',
        payment: { status: 'CANCELED', estimatedAmount: 150, finalAmount: 180 },
        cancellation: { label: 'Prestador indisponível', note: 'Imprevisto' }
      })
    );
    expect(text(fixture)).toContain('Cancelado');
    expect(text(fixture)).toContain('R$ 180,00');
    expect(text(fixture)).toContain('Motivo: Prestador indisponível · Imprevisto');
    expect(fixture.nativeElement.querySelector('[data-testid="next-step"]')).toBeNull();
  });

  it('shows an error when the order cannot be loaded', async () => {
    const { fixture } = await render(throwError(() => new Error('403')));
    expect(text(fixture)).toContain('Não foi possível carregar este pedido');
  });
});
