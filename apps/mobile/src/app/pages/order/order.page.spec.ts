import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular, RefresherCustomEvent } from '@ionic/angular';
import { Observable, of, Subject, throwError } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { OrderDetails } from '@app/core/orders/orders.models';
import { OrdersService } from '@app/core/orders/orders.service';
import { FakeAuth, otherCustomer } from '../../../testing/fakes';
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
  let auth: FakeAuth;
  let fixture: ComponentFixture<OrderPage>;
  let detailsSpy: jasmine.Spy<(id: string) => Observable<OrderDetails>>;

  async function render(...responses: Observable<OrderDetails>[]) {
    auth = new FakeAuth();
    detailsSpy = jasmine.createSpy('details').and.returnValues(...responses);
    TestBed.configureTestingModule({
      imports: [OrderPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: { details: detailsSpy } },
        { provide: AuthService, useValue: auth }
      ]
    });
    fixture = TestBed.createComponent(OrderPage);
    fixture.componentRef.setInput('id', '99');
    await stable();
    return fixture.componentInstance;
  }

  async function stable() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('shows the status, what happens next, the details and the timeline', async () => {
    await render(of(details));
    expect(detailsSpy).toHaveBeenCalledWith('99');
    expect(text()).toContain('Aguardando pagamento');
    expect(text()).toContain('faça o pagamento por PIX no site');
    expect(text()).toContain('Carlos Lima');
    expect(text()).toContain('Rua A, 10 · Centro · Diadema/SP');
    expect(text()).toContain('R$ 150,00');
    expect(text()).toContain('Solicitação enviada');
    expect(text()).toContain('Prestador aceitou');
  });

  it('shows the final amount and the cancellation reason when there is one', async () => {
    await render(
      of({
        ...details,
        status: 'CANCELADO',
        payment: { status: 'CANCELED', estimatedAmount: 150, finalAmount: 180 },
        cancellation: { label: 'Prestador indisponível', note: 'Imprevisto' }
      })
    );
    expect(text()).toContain('Cancelado');
    expect(text()).toContain('R$ 180,00');
    expect(text()).toContain('Motivo: Prestador indisponível · Imprevisto');
    expect(fixture.nativeElement.querySelector('[data-testid="next-step"]')).toBeNull();
  });

  it('shows an error when the order cannot be loaded', async () => {
    await render(throwError(() => new Error('403')));
    expect(text()).toContain('Não foi possível carregar este pedido');
  });

  it('K: a page kept in the Ionic stack does not show the old account order when it comes back', async () => {
    const forB = new Subject<OrderDetails>();
    const page = await render(of(details), forB);
    expect(text()).toContain('Carlos Lima');

    page.ionViewWillLeave(); // navega para outra tela; a página fica na pilha
    auth.signOut();
    auth.signIn(otherCustomer);
    fixture.detectChanges();
    expect(text()).not.toContain('Carlos Lima');

    page.ionViewWillEnter(); // volta para a página
    await stable();
    expect(text()).not.toContain('Carlos Lima');
    expect(text()).not.toContain('Rua A');
    expect(detailsSpy).toHaveBeenCalledTimes(2); // nova busca, com a sessão de B
  });

  it('L: account B opening an order of A sees no private data', async () => {
    const page = await render(of(details), throwError(() => new HttpErrorResponse({ status: 403 })));
    auth.signOut();
    auth.signIn(otherCustomer);
    await stable();
    expect(text()).toContain('Não foi possível carregar este pedido');
    expect(text()).not.toContain('Carlos Lima');
    expect(text()).not.toContain('Troca de chuveiro');
    expect(page.order()).toBeNull();
  });

  it('S/T: a refresh is finished after success and after an error', async () => {
    const page = await render(of(details), of(details), throwError(() => new Error('x')));
    const ok = jasmine.createSpy('ok').and.resolveTo();
    page.refresh({ target: { complete: ok } } as unknown as RefresherCustomEvent);
    await stable();
    const failed = jasmine.createSpy('failed').and.resolveTo();
    page.refresh({ target: { complete: failed } } as unknown as RefresherCustomEvent);
    await stable();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
