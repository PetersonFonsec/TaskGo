import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { NewOrder } from './orders.models';
import { createOrderErrorMessage, OrdersService } from './orders.service';

/** Uma tentativa de criar um pedido, do jeito que foi enviada à API. */
export interface OrderIntent extends NewOrder {
  /** Identidade da tentativa; vai para a API como `Idempotency-Key`. */
  readonly id: string;
  readonly userId: string;
  /** Quando o app criou a tentativa (ISO). */
  readonly startedAt: string;
  /** Só para mostrar ao cliente o que está pendente. */
  readonly summary: string;
  /** A API disse que a chave pertence a outro pedido; nunca é repetida. */
  readonly conflict?: true;
}

export type SubmissionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly intent: OrderIntent }
  | { readonly kind: 'created'; readonly intent: OrderIntent; readonly orderId: string }
  /** A API pode ter criado o pedido; nada novo é enviado até isso se resolver. */
  | { readonly kind: 'unknown'; readonly intent: OrderIntent }
  /**
   * A API recusou a chave por já pertencer a outro pedido. Não prova que nada
   * foi criado: o cliente confere os pedidos antes de pedir de novo. Bloqueia
   * novos pedidos (também após reiniciar) até `reviewed()`.
   */
  | { readonly kind: 'conflict'; readonly intent: OrderIntent; readonly message: string }
  /**
   * Nada foi criado. `rejected`: a API recusou (o cliente escolhe outro horário).
   * `storage`: o aparelho não gravou a tentativa, então nada foi enviado.
   */
  | {
      readonly kind: 'failed';
      readonly intent: OrderIntent;
      readonly reason: 'rejected' | 'storage';
      readonly message: string;
    };

const IDLE: SubmissionState = { kind: 'idle' };
const STORAGE_FAILED = 'Não foi possível guardar o pedido neste aparelho. Nada foi enviado; tente de novo.';
const CONFLICT =
  'Não conseguimos confirmar esta solicitação. Confira seus pedidos antes de pedir de novo.';
/** `errorCode` da API para uma Idempotency-Key já usada com outro pedido. */
export const IDEMPOTENCY_KEY_PAYLOAD_MISMATCH = 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH';

/**
 * Cria pedidos sem duplicar quando a resposta se perde.
 *
 * Cada tentativa tem um id próprio, enviado como `Idempotency-Key`: a API
 * devolve o pedido já criado quando recebe a mesma chave de novo, inclusive em
 * requisições simultâneas. Regras:
 * 1. Nada é enviado antes de a tentativa estar gravada no armazenamento seguro
 *    e de a sessão que a iniciou ainda ser a atual.
 * 2. Sem resposta (rede, 5xx), a tentativa fica `unknown`, bloqueia novos
 *    pedidos e só se resolve repetindo a mesma chave (agora ou após reiniciar).
 * 3. Cada operação só apaga do armazenamento a própria tentativa (compara o id
 *    dentro de uma fila), e só enquanto a sessão que a iniciou for a atual.
 */
@Injectable({ providedIn: 'root' })
export class OrderSubmission {
  readonly #auth = inject(AuthService);
  readonly #orders = inject(OrdersService);
  readonly #store = inject(SECURE_STORE);

  readonly #current = signal<{ readonly session: number; readonly value: SubmissionState }>({
    session: -1,
    value: IDLE
  });
  #loading: { readonly session: number; readonly promise: Promise<void> } | null = null;
  /** Fila das operações no armazenamento: ler, comparar e apagar não se intercalam. */
  #queue: Promise<unknown> = Promise.resolve();

  /** Estado da sessão atual; o de outra conta nunca aparece aqui. */
  readonly state = computed(() => {
    const current = this.#current();
    return current.session === this.#auth.session() ? current.value : IDLE;
  });

  /** Carrega a tentativa pendente da conta logada (após login ou reinício) e a repete. */
  load(): Promise<void> {
    const session = this.#auth.generation();
    if (this.#loading?.session !== session) {
      this.#loading = { session, promise: this.#load(session) };
    }
    return this.#loading.promise;
  }

  async submit(order: NewOrder, summary: string): Promise<SubmissionState> {
    await this.load();
    const session = this.#auth.generation();
    const user = this.#auth.user();
    const state = this.state();
    if (!user || state.kind === 'submitting' || state.kind === 'unknown' || state.kind === 'conflict') {
      return state;
    }
    const intent: OrderIntent = {
      id: crypto.randomUUID(),
      serviceId: order.serviceId,
      scheduledFor: order.scheduledFor,
      addressId: order.addressId,
      userId: String(user.id),
      startedAt: new Date().toISOString(),
      summary
    };
    // Bloqueia um segundo toque já agora, antes de qualquer espera.
    this.#set(session, { kind: 'submitting', intent });
    const persisted = await this.#persist(intent, session).catch(() => false);
    if (!persisted) {
      return this.#set(session, {
        kind: 'failed',
        intent,
        reason: 'storage',
        message: STORAGE_FAILED
      });
    }
    if (session !== this.#auth.generation()) {
      // A sessão mudou depois da gravação: a tentativa é abandonada sem envio.
      await this.#forget(intent);
      return this.state();
    }
    return this.#send(session, intent, false);
  }

  /** Repete a tentativa pendente com a mesma chave: a API cria no máximo um pedido. */
  async retry(): Promise<SubmissionState> {
    const session = this.#auth.generation();
    const state = this.state();
    if (state.kind !== 'unknown') return state;
    this.#set(session, { kind: 'submitting', intent: state.intent });
    return this.#send(session, state.intent, true);
  }

  /** O cliente foi conferir os pedidos: encerra o conflito e libera novos pedidos. */
  async reviewed(): Promise<void> {
    const session = this.#auth.generation();
    const state = this.state();
    if (state.kind !== 'conflict') return;
    this.#set(session, IDLE);
    await this.#forgetIfCurrent(session, state.intent);
  }

  /** O cliente já viu o resultado (pedido aberto ou outro horário escolhido). */
  acknowledge(): void {
    const state = this.state();
    if (state.kind === 'created' || state.kind === 'failed') {
      this.#set(this.#auth.generation(), IDLE);
    }
  }

  async #send(session: number, intent: OrderIntent, repeat: boolean): Promise<SubmissionState> {
    const { serviceId, scheduledFor, addressId } = intent;
    try {
      const order = await firstValueFrom(
        this.#orders.create({ serviceId, scheduledFor, addressId }, intent.id)
      );
      await this.#forgetIfCurrent(session, intent);
      return this.#set(session, { kind: 'created', intent, orderId: String(order.id) });
    } catch (error) {
      if (isKeyConflict(error)) {
        // A chave nunca mais é enviada; o registro fica marcado para o aviso
        // sobreviver a um reinício.
        const marked: OrderIntent = { ...intent, conflict: true };
        if (session === this.#auth.generation()) await this.#markConflict(marked);
        return this.#set(session, { kind: 'conflict', intent: marked, message: CONFLICT });
      }
      if (!isRejectedBeforeCreation(error, repeat)) {
        return this.#set(session, { kind: 'unknown', intent });
      }
      await this.#forgetIfCurrent(session, intent);
      return this.#set(session, {
        kind: 'failed',
        intent,
        reason: 'rejected',
        message: createOrderErrorMessage(error)
      });
    }
  }

  /** Grava a tentativa; se a sessão mudou durante a gravação, apaga-a na mesma operação. */
  #persist(intent: OrderIntent, session: number): Promise<boolean> {
    return this.#run(async () => {
      try {
        await this.#store.setItem(storageKey(intent.userId), JSON.stringify(intent));
      } catch (error) {
        // Gravação incerta: não pode sobrar um registro que seria repetido depois.
        await this.#removeIfOwned(intent).catch(() => undefined);
        throw error;
      }
      if (session === this.#auth.generation()) return true;
      await this.#removeIfOwned(intent).catch(() => undefined);
      return true;
    });
  }

  /** Regrava a própria tentativa como conflito; não toca numa tentativa posterior. */
  #markConflict(intent: OrderIntent): Promise<void> {
    return this.#run(async () => {
      const key = storageKey(intent.userId);
      const stored = parseIntent(await this.#store.getItem(key), intent.userId);
      if (stored?.id === intent.id) await this.#store.setItem(key, JSON.stringify(intent));
    }).catch(() => undefined);
  }

  /** Resultado conhecido: só a sessão que iniciou a operação mexe no armazenamento. */
  async #forgetIfCurrent(session: number, intent: OrderIntent): Promise<void> {
    if (session === this.#auth.generation()) await this.#forget(intent);
  }

  /**
   * Apaga a tentativa só se a gravada ainda for ela. Se falhar, o registro
   * fica; repeti-lo depois é seguro porque a chave é a mesma.
   */
  #forget(intent: OrderIntent): Promise<void> {
    return this.#run(() => this.#removeIfOwned(intent)).catch(() => undefined);
  }

  async #removeIfOwned(intent: OrderIntent): Promise<void> {
    const stored = parseIntent(await this.#store.getItem(storageKey(intent.userId)), intent.userId);
    if (stored?.id === intent.id) await this.#store.removeItem(storageKey(intent.userId));
  }

  /** Só altera a tela se a sessão ainda for a mesma em que a operação começou. */
  #set(session: number, value: SubmissionState): SubmissionState {
    if (session === this.#auth.generation()) this.#current.set({ session, value });
    return value;
  }

  #run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #load(session: number): Promise<void> {
    if (this.#current().session !== session) this.#set(session, IDLE);
    const user = this.#auth.user();
    if (!user) return;
    const userId = String(user.id);
    const raw = await this.#run(() => this.#store.getItem(storageKey(userId))).catch(() => null);
    const intent = parseIntent(raw, userId);
    if (!intent || session !== this.#auth.generation() || this.state().kind !== 'idle') return;
    if (intent.conflict) {
      this.#set(session, { kind: 'conflict', intent, message: CONFLICT });
      return;
    }
    this.#set(session, { kind: 'unknown', intent });
    // Repetir a mesma chave é seguro: resolve a tentativa sem risco de duplicar.
    await this.retry();
  }
}

/**
 * Recusas que provam que esta chave não tem pedido. No primeiro envio, qualquer
 * 4xx (menos 408): a requisição foi recusada e nenhuma anterior existiu. Na
 * repetição, só 400 e 404, que a API devolve depois de procurar a chave; 401,
 * 403 ou 429 podem vir antes disso e não dizem nada sobre o envio anterior.
 */
function isKeyConflict(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 409 &&
    error.error?.errorCode === IDEMPOTENCY_KEY_PAYLOAD_MISMATCH
  );
}

function isRejectedBeforeCreation(error: unknown, repeat: boolean): boolean {
  if (!(error instanceof HttpErrorResponse)) return false;
  if (repeat) return error.status === 400 || error.status === 404;
  return error.status >= 400 && error.status < 500 && error.status !== 408;
}

function storageKey(userId: string): string {
  return `order_intent_${userId}`;
}

function parseIntent(raw: string | null, userId: string): OrderIntent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<OrderIntent>;
    return value.userId === userId &&
      typeof value.id === 'string' &&
      value.id.length > 0 &&
      typeof value.serviceId === 'string' &&
      typeof value.scheduledFor === 'string' &&
      typeof value.addressId === 'string' &&
      typeof value.startedAt === 'string'
      ? ({ summary: '', ...value } as OrderIntent)
      : null;
  } catch {
    return null;
  }
}
