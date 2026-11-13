import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { FakeAuth, MemorySecureStore, otherCustomer, settle } from '../../../testing/fakes';
import { NewOrder, OrderListItem } from './orders.models';
import { OrderSubmission } from './order-submission.service';
import { OrdersService } from './orders.service';

const monday10: NewOrder = { serviceId: '1', scheduledFor: '2026-11-16T13:00:00.000Z', addressId: '7' };
const monday11: NewOrder = { ...monday10, scheduledFor: '2026-11-16T14:00:00.000Z' };

function listed(order: NewOrder, id = '99'): OrderListItem {
  return {
    id,
    status: 'AGUARDANDO_APROVACAO',
    serviceId: order.serviceId,
    scheduledFor: order.scheduledFor,
    requestedAt: new Date().toISOString(),
    service: { title: 'Troca de chuveiro' }
  };
}

const offline = () => new HttpErrorResponse({ status: 0 });
const slotTaken = () =>
  new HttpErrorResponse({ status: 400, error: { message: 'Selected scheduled slot is no longer available' } });

/** API controlável: cada chamada fica pendente até o teste responder. */
class FakeOrders {
  readonly creates: { body: NewOrder; response: Subject<{ id: string }> }[] = [];
  readonly lists: Subject<readonly OrderListItem[]>[] = [];

  create(body: NewOrder) {
    const response = new Subject<{ id: string }>();
    this.creates.push({ body, response });
    return response;
  }

  list() {
    const response = new Subject<readonly OrderListItem[]>();
    this.lists.push(response);
    return response;
  }

  lastList(): Subject<readonly OrderListItem[]> {
    return this.lists[this.lists.length - 1];
  }
}

describe('OrderSubmission', () => {
  let auth: FakeAuth;
  let api: FakeOrders;
  let store: MemorySecureStore;
  let submission: OrderSubmission;

  beforeEach(() => {
    auth = new FakeAuth();
    api = new FakeOrders();
    store = new MemorySecureStore();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: auth },
        { provide: OrdersService, useValue: api },
        { provide: SECURE_STORE, useValue: store }
      ]
    });
    submission = TestBed.inject(OrderSubmission);
  });

  /** Mesmo armazenamento, serviço novo: como o app depois de reiniciar. */
  const restart = () => TestBed.runInInjectionContext(() => new OrderSubmission());
  const stored = (userId = '7') => store.data.get(`order_intent_${userId}`);

  it('A: creates the order once and forgets the attempt', async () => {
    const result = submission.submit(monday10, 'Troca de chuveiro');
    await settle();
    expect(submission.state().kind).toBe('submitting');
    expect(stored()).toContain('"scheduledFor":"2026-11-16T13:00:00.000Z"');

    api.creates[0].response.next({ id: '99' });
    expect(await result).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
    expect(api.creates.length).toBe(1);
    expect(stored()).toBeUndefined();
  });

  it('B: simultaneous taps send a single POST', async () => {
    const first = submission.submit(monday10, '');
    const second = submission.submit(monday10, '');
    await settle();
    expect(api.creates.length).toBe(1);
    api.creates[0].response.next({ id: '99' });
    await first;
    expect((await second).kind).toBe('submitting');
    expect(api.creates.length).toBe(1);
  });

  it('C: a lost response is found in the order list instead of being sent again', async () => {
    const result = submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(offline());
    await settle();
    expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'unknown', checking: true }));

    api.lastList().next([listed(monday11, '98'), listed(monday10, '99')]);
    expect(await result).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
    expect(api.creates.length).toBe(1);
    expect(stored()).toBeUndefined();
  });

  it('C: while the result is unknown nothing new is sent; a resend repeats the same request', async () => {
    void submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(new HttpErrorResponse({ status: 502 }));
    await settle();
    api.lastList().error(offline()); // a lista também não carrega
    await settle();
    expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'unknown', checking: false }));

    expect((await submission.submit(monday10, '')).kind).toBe('unknown');
    expect(api.creates.length).toBe(1);

    // Reenvio: confere a lista primeiro e só então repete o mesmo corpo.
    const resent = submission.resend();
    await settle();
    api.lastList().next([]);
    await settle();
    expect(api.creates.length).toBe(2);
    expect(api.creates[1].body).toEqual(api.creates[0].body);
    // O primeiro envio existia: o horário está ocupado e a API recusa...
    api.creates[1].response.error(slotTaken());
    await settle();
    // ...e a busca seguinte encontra o pedido original.
    api.lastList().next([listed(monday10, '99')]);
    expect(await resent).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
  });

  it('D: choosing another slot does not discard the unresolved attempt', async () => {
    void submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(offline());
    await settle();
    api.lastList().next([]);
    await settle();

    const other = await submission.submit(monday11, '');
    submission.acknowledge();

    expect(other).toEqual(jasmine.objectContaining({ kind: 'unknown' }));
    expect(submission.state().kind).toBe('unknown');
    expect(api.creates.length).toBe(1);
    expect(stored()).toContain('2026-11-16T13:00:00.000Z');
  });

  it('E: a clear refusal frees the customer to pick another slot', async () => {
    const first = submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(slotTaken());
    await settle();
    api.lastList().next([]); // ocupado por outra pessoa, não por nós
    const failed = await first;
    expect(failed).toEqual(
      jasmine.objectContaining({ kind: 'failed', message: 'Esse horário não está mais disponível. Escolha outro.' })
    );
    expect(stored()).toBeUndefined();

    submission.acknowledge();
    const second = submission.submit(monday11, '');
    await settle();
    expect(api.creates[1].body.scheduledFor).toBe(monday11.scheduledFor);
    api.creates[1].response.next({ id: '100' });
    expect((await second).kind).toBe('created');
  });

  it('E: a refusal while the list cannot be read stays unknown', async () => {
    const result = submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(slotTaken());
    await settle();
    api.lastList().error(offline());
    expect((await result).kind).toBe('unknown');
  });

  it('treats 401 and 429 as not created, and 5xx or network errors as unknown', async () => {
    for (const [status, expected] of [
      [401, 'failed'],
      [429, 'failed'],
      [500, 'unknown'],
      [504, 'unknown'],
      [408, 'unknown']
    ] as const) {
      const result = submission.submit(monday10, '');
      await settle();
      api.creates[api.creates.length - 1].response.error(new HttpErrorResponse({ status }));
      await settle();
      api.lastList().next([]);
      expect((await result).kind).withContext(String(status)).toBe(expected);
      if (expected === 'unknown') {
        // Resolve para o próximo caso: a lista agora mostra o pedido.
        const checked = submission.check();
        await settle();
        api.lastList().next([listed(monday10)]);
        await checked;
      }
      submission.acknowledge();
    }
  });

  it('F: after a restart the pending attempt still blocks a new order and is looked up', async () => {
    void submission.submit(monday10, 'Troca de chuveiro');
    await settle();
    // O app fecha antes de qualquer resposta.

    const reopened = restart();
    const loading = reopened.load();
    await settle();
    expect(reopened.state()).toEqual(jasmine.objectContaining({ kind: 'unknown', checking: true }));
    api.lastList().next([]);
    await loading;

    expect((await reopened.submit(monday11, '')).kind).toBe('unknown');
    expect(api.creates.length).toBe(1);
    expect(stored()).not.toContain('token');

    // Quando a lista mostrar o pedido, o aparelho fica livre de novo.
    const checked = reopened.check();
    await settle();
    api.lastList().next([listed(monday10, '99')]);
    expect(await checked).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
    expect(stored()).toBeUndefined();
  });

  it('F: an old order of the same slot made before the attempt is not taken as the result', async () => {
    void submission.submit(monday10, '');
    await settle();
    api.creates[0].response.error(offline());
    await settle();
    api.lastList().next([{ ...listed(monday10, '50'), requestedAt: '2026-01-01T00:00:00.000Z' }]);
    await settle();
    expect(submission.state().kind).toBe('unknown');
  });

  it('G: nothing from account A reaches account B', async () => {
    const fromA = submission.submit(monday10, '');
    await settle();
    auth.signOut();
    auth.signIn(otherCustomer);
    await submission.load();
    expect(submission.state().kind).toBe('idle');

    // A resposta atrasada de A chega com B logado.
    api.creates[0].response.error(offline());
    await settle();
    api.lastList().next([]);
    await fromA;
    expect(submission.state().kind).toBe('idle');
    expect(stored('8')).toBeUndefined();
    expect(stored('7')).toBeDefined();

    // B pede normalmente.
    const fromB = submission.submit(monday11, '');
    await settle();
    expect(api.creates[1].body.scheduledFor).toBe(monday11.scheduledFor);
    api.creates[1].response.next({ id: '200' });
    expect(await fromB).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '200' }));

    // Quando A voltar, a pendência dele reaparece só para ele.
    auth.signOut();
    auth.signIn();
    const loading = submission.load();
    await settle();
    expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'unknown' }));
    api.lastList().next([]);
    await loading;
  });

  it('G: a late result of account A never replaces the state of account B', async () => {
    const fromA = submission.submit(monday10, '');
    await settle();
    auth.signOut();
    auth.signIn(otherCustomer);
    const fromB = submission.submit(monday11, '');
    await settle();
    expect(submission.state().kind).toBe('submitting');

    api.creates[0].response.next({ id: '99' }); // resposta de A
    await fromA;
    expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'submitting' }));

    api.creates[1].response.next({ id: '200' });
    expect(await fromB).toEqual(jasmine.objectContaining({ orderId: '200' }));
    expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '200' }));
  });

  it('G: a creation confirmed after switching accounts does not show up for B', async () => {
    const fromA = submission.submit(monday10, '');
    await settle();
    auth.signOut();
    auth.signIn(otherCustomer);
    api.creates[0].response.next({ id: '99' });
    expect((await fromA).kind).toBe('created');
    expect(submission.state().kind).toBe('idle');
    expect(stored('7')).toBeUndefined();
  });

  it('keeps going when the device storage fails (protection stays in memory)', async () => {
    store.failNext('set');
    const result = submission.submit(monday10, '');
    await settle();
    expect(api.creates.length).toBe(1);
    api.creates[0].response.error(offline());
    await settle();
    api.lastList().next([]);
    expect((await result).kind).toBe('unknown');
    expect((await submission.submit(monday11, '')).kind).toBe('unknown');
  });

  it('ignores corrupted or foreign saved attempts', async () => {
    store.data.set('order_intent_7', '{nope');
    await submission.load();
    expect(submission.state().kind).toBe('idle');

    store.data.set('order_intent_7', JSON.stringify({ ...monday10, userId: '8', startedAt: 'x' }));
    auth.signOut();
    auth.signIn();
    await submission.load();
    expect(submission.state().kind).toBe('idle');
  });

  it('does nothing without a logged account', async () => {
    auth.signOut();
    expect((await submission.submit(monday10, '')).kind).toBe('idle');
    expect((await submission.check()).kind).toBe('idle');
    expect((await submission.resend()).kind).toBe('idle');
    expect(api.creates.length).toBe(0);
  });
});
