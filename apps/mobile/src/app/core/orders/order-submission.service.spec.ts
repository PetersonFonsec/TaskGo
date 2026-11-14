import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { FakeAuth, MemorySecureStore, otherCustomer, settle } from '../../../testing/fakes';
import { NewOrder } from './orders.models';
import { OrderIntent, OrderSubmission } from './order-submission.service';
import { OrdersService } from './orders.service';

const monday10: NewOrder = { serviceId: '1', scheduledFor: '2026-11-16T13:00:00.000Z', addressId: '7' };
const monday11: NewOrder = { ...monday10, scheduledFor: '2026-11-16T14:00:00.000Z' };

const offline = () => new HttpErrorResponse({ status: 0 });
const slotTaken = () =>
  new HttpErrorResponse({ status: 400, error: { message: 'Selected scheduled slot is no longer available' } });

/**
 * API com idempotência real: a mesma chave devolve o mesmo pedido. Cada envio
 * fica pendente até o teste decidir se o servidor criou e se a resposta chega.
 */
class FakeOrders {
  readonly sent: { body: NewOrder; key: string; response: Subject<{ id: string }> }[] = [];
  readonly created = new Map<string, string>();
  readonly list = jasmine.createSpy('list');
  #next = 99;

  create(body: NewOrder, key: string) {
    const response = new Subject<{ id: string }>();
    this.sent.push({ body, key, response });
    return response;
  }

  /** O servidor processa o envio `index`: cria (ou acha) o pedido daquela chave. */
  serverCreates(index: number): string {
    const { key } = this.sent[index];
    if (!this.created.has(key)) this.created.set(key, String(this.#next++));
    return this.created.get(key)!;
  }

  answer(index: number): void {
    this.sent[index].response.next({ id: this.serverCreates(index) });
  }

  lose(index: number, status = 0): void {
    this.serverCreates(index);
    this.sent[index].response.error(new HttpErrorResponse({ status }));
  }

  reject(index: number, error = slotTaken()): void {
    this.sent[index].response.error(error);
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
  const stored = (userId = '7'): OrderIntent | undefined => {
    const raw = store.data.get(`order_intent_${userId}`);
    return raw ? (JSON.parse(raw) as OrderIntent) : undefined;
  };

  describe('persistence before sending', () => {
    it('A: writes the intent first, sends only after, and removes it once created', async () => {
      const result = submission.submit(monday10, 'Troca de chuveiro');
      await settle();
      expect(store.log).toEqual(['set order_intent_7']);
      expect(api.sent.length).toBe(1);
      expect(api.sent[0].key).toBe(stored()!.id);
      expect(api.sent[0].body).toEqual(monday10);

      api.answer(0);
      expect(await result).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
      expect(stored()).toBeUndefined();
      expect(api.list).not.toHaveBeenCalled();
    });

    it('A: nothing is sent while the write is still pending', async () => {
      const release = store.hold('set');
      const result = submission.submit(monday10, '');
      await settle();
      expect(api.sent.length).toBe(0);
      expect(submission.state().kind).toBe('submitting');
      release();
      await settle();
      expect(api.sent.length).toBe(1);
      api.answer(0);
      await result;
    });

    it('B: a failed write sends nothing and can be tried again', async () => {
      store.failNext('set');
      const failed = await submission.submit(monday10, '');
      expect(failed).toEqual(jasmine.objectContaining({ kind: 'failed', reason: 'storage' }));
      expect(api.sent.length).toBe(0);
      expect(stored()).toBeUndefined();

      submission.acknowledge();
      const again = submission.submit(monday10, '');
      await settle();
      expect(api.sent.length).toBe(1);
      api.answer(0);
      expect((await again).kind).toBe('created');
    });

    it('C: after a failed write and a restart there is nothing pending and nothing was sent', async () => {
      store.failNext('set');
      await submission.submit(monday10, '');
      const reopened = restart();
      await reopened.load();
      expect(reopened.state().kind).toBe('idle');
      expect(api.sent.length).toBe(0);
    });

    it('D: logging out while the intent is being written sends nothing and leaves nothing behind', async () => {
      const release = store.hold('set');
      const result = submission.submit(monday10, '');
      await settle();
      auth.signOut();
      release();
      await result;
      await settle();
      expect(api.sent.length).toBe(0);
      expect(stored()).toBeUndefined();

      // Mesmo usuário entra de novo: nada pendente, nenhum envio automático.
      auth.signIn();
      await submission.load();
      expect(submission.state().kind).toBe('idle');
      expect(api.sent.length).toBe(0);
    });

    it('E: simultaneous taps write one intent and send one request', async () => {
      const release = store.hold('set');
      const first = submission.submit(monday10, '');
      const second = submission.submit(monday10, '');
      await settle();
      release();
      await settle();
      expect(store.log.filter((entry) => entry.startsWith('set'))).toEqual(['set order_intent_7']);
      expect(api.sent.length).toBe(1);
      expect((await second).kind).toBe('submitting');
      api.answer(0);
      expect((await first).kind).toBe('created');
    });
  });

  describe('each operation only clears its own intent', () => {
    it('F: same session: confirming X removes X', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      const x = stored()!.id;
      api.answer(0);
      await result;
      expect(stored()).toBeUndefined();
      expect(api.sent[0].key).toBe(x);
    });

    it('G: an old operation X finishing after a new session of the same account wrote Y keeps Y', async () => {
      void submission.submit(monday10, ''); // X, resposta ainda não chegou
      await settle();
      const x = stored()!.id;

      // Logout e login da mesma conta: a nova sessão repete X pela chave e o resolve.
      auth.signOut();
      auth.signIn();
      const loading = submission.load();
      await settle();
      expect(api.sent[1].key).toBe(x);
      api.answer(1);
      await loading;
      submission.acknowledge();

      // A nova sessão grava Y.
      const fromY = submission.submit(monday11, '');
      await settle();
      const y = stored()!.id;
      expect(y).not.toBe(x);

      // A operação antiga X termina agora (sucesso tardio).
      api.answer(0);
      await settle();
      expect(stored()!.id).toBe(y);
      api.answer(2);
      await fromY;
      expect(stored()).toBeUndefined();
    });

    it('H: finishing account A does not touch the intent of account B', async () => {
      const fromA = submission.submit(monday10, '');
      await settle();
      auth.signOut();
      auth.signIn(otherCustomer);
      const fromB = submission.submit(monday11, '');
      await settle();
      expect(stored('8')).toBeDefined();

      api.answer(0); // A termina
      await fromA;
      expect(stored('8')).toBeDefined();
      expect(submission.state().kind).toBe('submitting'); // estado de B intacto
      api.answer(1);
      expect(await fromB).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '100' }));
      expect(stored('8')).toBeUndefined();
    });

    it('I: a stale cleanup queued before a newer write cannot remove the newer record', async () => {
      // X gravado e confirmado; a limpeza de X fica presa na leitura.
      const fromX = submission.submit(monday10, '');
      await settle();
      const x = stored()!.id;
      const releaseRead = store.hold('get');
      api.answer(0);
      await settle();

      // Enquanto isso, outra tentativa (Y) é gravada diretamente no armazenamento.
      const y: OrderIntent = { ...stored()!, id: 'y-intent', scheduledFor: monday11.scheduledFor };
      store.data.set('order_intent_7', JSON.stringify(y));
      releaseRead();
      await fromX;
      expect(stored()!.id).toBe('y-intent');
      expect(x).not.toBe('y-intent');
    });

    it('I: a cleanup in progress and a newer write never interleave', async () => {
      const fromX = submission.submit(monday10, '');
      await settle();
      const releaseRemove = store.hold('remove');
      api.answer(0); // X criado: a limpeza lê X e fica presa antes de apagar
      await settle();

      auth.signOut();
      auth.signIn();
      const fromY = submission.submit(monday11, ''); // Y precisa esperar a limpeza de X
      await settle();
      expect(api.sent.length).toBe(1);

      releaseRemove();
      await fromX;
      await settle();
      const y = stored()!;
      expect(y.scheduledFor).toBe(monday11.scheduledFor);
      expect(api.sent[1].key).toBe(y.id);
      api.answer(1);
      await fromY;
    });

    it('J: a late refusal of an old X, then a restart, still recovers Y', async () => {
      void submission.submit(monday10, ''); // X, sem resposta
      await settle();
      auth.signOut();
      auth.signIn();
      const loading = submission.load(); // a nova sessão resolve X pela chave
      await settle();
      api.answer(1);
      await loading;
      submission.acknowledge();

      const fromY = submission.submit(monday11, '');
      await settle();
      api.lose(2); // Y fica desconhecido
      await fromY;
      const y = stored()!.id;

      api.reject(0); // recusa tardia do X antigo
      await settle();
      expect(stored()!.id).toBe(y);

      const reopened = restart();
      const reloading = reopened.load();
      await settle();
      expect(api.sent[3].key).toBe(y);
      api.answer(3);
      await reloading;
      expect(reopened.state()).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '100' }));
    });
  });

  describe('reconciliation by key', () => {
    it('K: a lost response is resolved by repeating the same key, never creating a second order', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.lose(0);
      expect(await result).toEqual(jasmine.objectContaining({ kind: 'unknown' }));
      expect(stored()).toBeDefined();

      const retried = submission.retry();
      await settle();
      expect(api.sent[1].key).toBe(api.sent[0].key);
      expect(api.sent[1].body).toEqual(api.sent[0].body);
      api.answer(1);
      expect(await retried).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
      expect(api.created.size).toBe(1);
      expect(stored()).toBeUndefined();
    });

    it('L/M: the order list is never used to guess the result', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.lose(0);
      await result;
      void restart().load(); // repete a chave; a resposta fica pendente
      await settle();
      expect(api.sent.length).toBe(2);
      expect(api.list).not.toHaveBeenCalled();
    });

    it('L: a new attempt never takes an older order as its result', async () => {
      // Pedido antigo, do mesmo serviço e horário, criado por outra tentativa.
      const old = submission.submit(monday10, '');
      await settle();
      api.answer(0);
      await old;
      submission.acknowledge();

      const fresh = submission.submit(monday10, '');
      await settle();
      expect(api.sent[1].key).not.toBe(api.sent[0].key);
      api.reject(1); // o horário está ocupado pelo pedido antigo
      expect(await fresh).toEqual(jasmine.objectContaining({ kind: 'failed', reason: 'rejected' }));
    });

    it('N: a late answer of the first send and the retry agree on the same order', async () => {
      const first = submission.submit(monday10, '');
      await settle();
      api.sent[0].response.error(offline()); // cliente desiste; servidor ainda processando
      await first;
      const retried = submission.retry();
      await settle();
      api.answer(1); // o servidor conclui a primeira e a repetição devolve o mesmo pedido
      api.serverCreates(0);
      expect(await retried).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
      expect(api.created.size).toBe(1);
    });

    it('O: two retries at the same time send one request', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.lose(0);
      await result;
      const a = submission.retry();
      const b = submission.retry();
      await settle();
      expect(api.sent.length).toBe(2);
      api.answer(1);
      expect((await a).kind).toBe('created');
      expect((await b).kind).toBe('submitting');
    });

    it('P: while the API is unreachable the attempt stays unknown and blocks new orders', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.lose(0, 503);
      await result;
      const retried = submission.retry();
      await settle();
      api.sent[1].response.error(offline());
      expect(await retried).toEqual(jasmine.objectContaining({ kind: 'unknown' }));

      expect((await submission.submit(monday11, '')).kind).toBe('unknown');
      submission.acknowledge();
      expect(submission.state().kind).toBe('unknown');
      expect(api.sent.length).toBe(2);
    });

    it('on a retry, 401/403/429 say nothing about the first send and keep it unknown', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.lose(0);
      await result;
      for (const status of [401, 403, 429]) {
        const retried = submission.retry();
        await settle();
        api.reject(api.sent.length - 1, new HttpErrorResponse({ status }));
        expect((await retried).kind).withContext(String(status)).toBe('unknown');
      }
      expect(stored()).toBeDefined();
    });

    it('on a retry, a 400 from the API proves the key has no order', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.reject(0, new HttpErrorResponse({ status: 503 })); // recusado sem criar
      await result;
      const retried = submission.retry();
      await settle();
      api.reject(1);
      expect(await retried).toEqual(jasmine.objectContaining({ kind: 'failed', reason: 'rejected' }));
      expect(stored()).toBeUndefined();
    });

    it('on the first send, 401 and 429 are refusals; 5xx and 408 are unknown', async () => {
      for (const [status, expected] of [
        [401, 'failed'],
        [429, 'failed'],
        [500, 'unknown'],
        [408, 'unknown']
      ] as const) {
        const result = submission.submit(monday10, '');
        await settle();
        api.reject(api.sent.length - 1, new HttpErrorResponse({ status }));
        expect((await result).kind).withContext(String(status)).toBe(expected);
        if (expected === 'unknown') {
          const retried = submission.retry();
          await settle();
          api.answer(api.sent.length - 1);
          await retried;
        }
        submission.acknowledge();
      }
    });
  });

  describe('key conflict (409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH)', () => {
    const keyConflict = () =>
      new HttpErrorResponse({
        status: 409,
        error: {
          statusCode: 409,
          message: ['Idempotency-Key already used for a different order'],
          errorCode: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
        }
      });
    /** Envia, perde a resposta e deixa a tentativa em `unknown`. */
    const lostAttempt = async () => {
      const result = submission.submit(monday10, 'Troca de chuveiro');
      await settle();
      api.lose(0);
      await result;
    };

    it('I: a retry refused with the key conflict ends the attempt, never repeats the key and blocks until reviewed', async () => {
      await lostAttempt();
      const retried = submission.retry();
      await settle();
      api.reject(1, keyConflict());
      const state = await retried;
      expect(state).toEqual(jasmine.objectContaining({ kind: 'conflict' }));
      expect((state as { message: string }).message).toContain('Confira seus pedidos');

      // Nada é repetido nem enviado de novo, nem por retry nem por novo pedido.
      expect((await submission.retry()).kind).toBe('conflict');
      expect((await submission.submit(monday11, '')).kind).toBe('conflict');
      submission.acknowledge(); // trocar de horário não apaga o aviso
      expect(submission.state().kind).toBe('conflict');
      expect(api.sent.length).toBe(2);

      // Após reiniciar, o aviso volta e a chave não é enviada.
      const reopened = restart();
      await reopened.load();
      expect(reopened.state().kind).toBe('conflict');
      expect(api.sent.length).toBe(2);

      // Depois de conferir os pedidos, um novo pedido usa uma chave nova.
      await submission.reviewed();
      expect(stored()).toBeUndefined();
      const fresh = submission.submit(monday11, '');
      await settle();
      expect(api.sent[2].key).not.toBe(api.sent[0].key);
      api.answer(2);
      expect((await fresh).kind).toBe('created');
    });

    it('I: the conflict on a first send is also recognised and not taken as a plain refusal', async () => {
      const result = submission.submit(monday10, '');
      await settle();
      api.reject(0, keyConflict());
      expect((await result).kind).toBe('conflict');
      expect(stored()?.conflict).toBeTrue();
    });

    it('J: another 409 on a retry is not a key conflict and keeps the attempt unknown', async () => {
      await lostAttempt();
      for (const error of [
        { message: ['Something else'], errorCode: 'OTHER_CONFLICT' },
        { message: ['Idempotency-Key already used for a different order'] } // sem código
      ]) {
        const retried = submission.retry();
        await settle();
        api.reject(api.sent.length - 1, new HttpErrorResponse({ status: 409, error }));
        expect((await retried).kind).toBe('unknown');
      }
      expect(stored()?.conflict).toBeUndefined();
    });

    it('K: a 503 on a retry keeps the attempt unknown and stored', async () => {
      await lostAttempt();
      const retried = submission.retry();
      await settle();
      api.reject(1, new HttpErrorResponse({ status: 503 }));
      expect((await retried).kind).toBe('unknown');
      expect(stored()).toBeDefined();
    });

    it('L: with the network down the attempt stays recoverable and later resolves with the same key', async () => {
      await lostAttempt();
      const retried = submission.retry();
      await settle();
      api.sent[1].response.error(offline());
      expect((await retried).kind).toBe('unknown');
      const again = submission.retry();
      await settle();
      expect(api.sent[2].key).toBe(api.sent[0].key);
      api.answer(2);
      expect(await again).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
    });

    it('M/N: a legitimate replay after a restart is created, not a conflict', async () => {
      await lostAttempt();
      const reopened = restart();
      const loading = reopened.load();
      await settle();
      expect(api.sent[1].key).toBe(api.sent[0].key);
      api.answer(1);
      await loading;
      expect(reopened.state()).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
      expect(api.created.size).toBe(1);
    });

    it('O: a conflict of account A never shows for, nor is cleared by, account B', async () => {
      await lostAttempt();
      const retried = submission.retry();
      await settle();
      auth.signOut();
      auth.signIn(otherCustomer);
      api.reject(1, keyConflict());
      await retried;
      await submission.load();
      expect(submission.state().kind).toBe('idle');
      await submission.reviewed();
      expect(stored('7')).toBeDefined();
      expect(stored('8')).toBeUndefined();
      const fromB = submission.submit(monday11, '');
      await settle();
      expect(api.sent[2].key).not.toBe(api.sent[0].key);
      api.answer(2);
      expect((await fromB).kind).toBe('created');
    });
  });

  describe('restart and accounts', () => {
    it('after a restart the pending attempt is repeated with its key and resolved', async () => {
      void submission.submit(monday10, 'Troca de chuveiro');
      await settle();
      // O app fecha antes de qualquer resposta (o servidor criou o pedido).
      api.serverCreates(0);

      const reopened = restart();
      const loading = reopened.load();
      await settle();
      expect(reopened.state().kind).toBe('submitting');
      expect(api.sent[1].key).toBe(api.sent[0].key);
      api.answer(1);
      await loading;
      expect(reopened.state()).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
      expect(api.created.size).toBe(1);
      expect(stored()).toBeUndefined();
      expect(JSON.stringify(api.sent[0].body)).not.toContain('token');
    });

    it('nothing from account A reaches account B, and A finds its attempt when it comes back', async () => {
      const fromA = submission.submit(monday10, '');
      await settle();
      auth.signOut();
      auth.signIn(otherCustomer);
      await submission.load();
      expect(submission.state().kind).toBe('idle');
      api.lose(0);
      await fromA;
      expect(submission.state().kind).toBe('idle');
      expect(stored('8')).toBeUndefined();
      expect(stored('7')).toBeDefined();

      auth.signOut();
      auth.signIn();
      const loading = submission.load();
      await settle();
      expect(api.sent[1].key).toBe(api.sent[0].key);
      api.answer(1);
      await loading;
      expect(submission.state()).toEqual(jasmine.objectContaining({ kind: 'created', orderId: '99' }));
    });

    it('ignores corrupted, keyless or foreign saved attempts', async () => {
      store.data.set('order_intent_7', '{nope');
      await submission.load();
      expect(submission.state().kind).toBe('idle');
      for (const saved of [
        { ...monday10, userId: '7', startedAt: 'x' }, // sem id
        { ...monday10, id: 'k', userId: '8', startedAt: 'x' } // de outra conta
      ]) {
        store.data.set('order_intent_7', JSON.stringify(saved));
        auth.signOut();
        auth.signIn();
        await submission.load();
        expect(submission.state().kind).toBe('idle');
      }
      expect(api.sent.length).toBe(0);
    });

    it('does nothing without a logged account', async () => {
      auth.signOut();
      expect((await submission.submit(monday10, '')).kind).toBe('idle');
      expect((await submission.retry()).kind).toBe('idle');
      expect(api.sent.length).toBe(0);
    });
  });
});
