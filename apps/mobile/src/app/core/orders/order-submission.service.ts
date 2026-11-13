import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { NewOrder, OrderListItem } from './orders.models';
import { createOrderErrorMessage, OrdersService } from './orders.service';

/** Uma tentativa de criar um pedido, do jeito que foi enviada à API. */
export interface OrderIntent extends NewOrder {
  readonly userId: string;
  /** Quando o app enviou pela primeira vez (ISO). */
  readonly startedAt: string;
  /** Só para mostrar ao cliente o que está pendente. */
  readonly summary: string;
}

export type SubmissionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting'; readonly intent: OrderIntent }
  | { readonly kind: 'created'; readonly intent: OrderIntent; readonly orderId: string }
  /** A API pode ter criado o pedido; nada novo é enviado até isso se resolver. */
  | { readonly kind: 'unknown'; readonly intent: OrderIntent; readonly checking: boolean }
  /** A API recusou antes de criar: o cliente pode escolher outro horário. */
  | { readonly kind: 'failed'; readonly intent: OrderIntent; readonly message: string };

const IDLE: SubmissionState = { kind: 'idle' };
/** Folga para diferença de relógio entre aparelho e servidor. */
const CLOCK_SKEW_MS = 10 * 60 * 1000;

/**
 * Cria pedidos sem duplicar quando a resposta se perde.
 *
 * `POST /orders` não tem chave de idempotência. A garantia vem do próprio
 * backend: ele serializa as reservas de cada prestador e recusa um horário já
 * ocupado por pedido ativo. Então, quando o resultado é desconhecido:
 * 1. a tentativa fica gravada (sobrevive a reinícios) e bloqueia novas criações;
 * 2. o app procura em `GET /orders` um pedido do mesmo serviço e horário criado
 *    depois do envio. Achou: está criado. Não achou: continua desconhecido
 *    (o envio ainda pode estar chegando ao servidor);
 * 3. o cliente pode reenviar exatamente o mesmo pedido. Se o primeiro existir, o
 *    horário já está ocupado e a API recusa; o app então o encontra na lista.
 * Só uma recusa da API seguida de uma busca sem resultado libera outro horário.
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

  /** Estado da sessão atual; o de outra conta nunca aparece aqui. */
  readonly state = computed(() => {
    const current = this.#current();
    return current.session === this.#auth.session() ? current.value : IDLE;
  });

  /** Carrega a tentativa pendente da conta logada (após login ou reinício). */
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
    if (!user || state.kind === 'submitting' || state.kind === 'unknown') return state;
    const intent: OrderIntent = {
      serviceId: order.serviceId,
      scheduledFor: order.scheduledFor,
      addressId: order.addressId,
      userId: String(user.id),
      startedAt: new Date().toISOString(),
      summary
    };
    this.#set(session, { kind: 'submitting', intent });
    // Gravada antes do envio: se o app fechar no meio, o reinício sabe que há algo pendente.
    await this.#store.setItem(storageKey(intent.userId), JSON.stringify(intent)).catch(() => undefined);
    return this.#send(session, intent);
  }

  /** Procura o pedido pendente na lista de pedidos da conta. */
  async check(): Promise<SubmissionState> {
    const session = this.#auth.generation();
    const state = this.state();
    if (state.kind !== 'unknown') return state;
    this.#set(session, { ...state, checking: true });
    return this.#reconcile(session, state.intent);
  }

  /** Reenvia exatamente o mesmo pedido; seguro porque o horário só cabe um. */
  async resend(): Promise<SubmissionState> {
    const session = this.#auth.generation();
    const state = this.state();
    if (state.kind !== 'unknown') return state;
    const checked = await this.check();
    if (checked.kind !== 'unknown' || session !== this.#auth.generation()) return checked;
    this.#set(session, { kind: 'submitting', intent: state.intent });
    return this.#send(session, state.intent);
  }

  /** O cliente já viu o resultado (pedido aberto ou outro horário escolhido). */
  acknowledge(): void {
    const state = this.state();
    if (state.kind === 'created' || state.kind === 'failed') {
      this.#set(this.#auth.generation(), IDLE);
    }
  }

  async #send(session: number, intent: OrderIntent): Promise<SubmissionState> {
    const { serviceId, scheduledFor, addressId } = intent;
    try {
      const order = await firstValueFrom(this.#orders.create({ serviceId, scheduledFor, addressId }));
      return this.#settle(session, intent, { kind: 'created', intent, orderId: String(order.id) });
    } catch (error) {
      if (!isRejectedBeforeCreation(error)) {
        this.#set(session, { kind: 'unknown', intent, checking: true });
        return this.#reconcile(session, intent);
      }
      // Recusa clara. Ainda assim confere: a recusa pode ser o horário ocupado
      // pelo próprio pedido de um envio anterior.
      const found = await this.#find(intent).catch(() => undefined);
      if (found === undefined) {
        return this.#set(session, { kind: 'unknown', intent, checking: false });
      }
      return this.#settle(
        session,
        intent,
        found
          ? { kind: 'created', intent, orderId: found.id }
          : { kind: 'failed', intent, message: createOrderErrorMessage(error) }
      );
    }
  }

  async #reconcile(session: number, intent: OrderIntent): Promise<SubmissionState> {
    const found = await this.#find(intent).catch(() => undefined);
    if (found) return this.#settle(session, intent, { kind: 'created', intent, orderId: found.id });
    // Lista sem o pedido não prova que ele não existe: o envio pode estar chegando.
    return this.#set(session, { kind: 'unknown', intent, checking: false });
  }

  /** `null` = não está na lista; rejeita se a lista não pôde ser lida. */
  async #find(intent: OrderIntent): Promise<OrderListItem | null> {
    const orders = await firstValueFrom(this.#orders.list());
    const after = Date.parse(intent.startedAt) - CLOCK_SKEW_MS;
    const at = Date.parse(intent.scheduledFor);
    return (
      orders.find(
        (order) =>
          String(order.serviceId) === intent.serviceId &&
          !!order.scheduledFor &&
          Date.parse(order.scheduledFor) === at &&
          (!order.requestedAt || Date.parse(order.requestedAt) >= after)
      ) ?? null
    );
  }

  /** Resultado conhecido: a tentativa deixa de estar pendente para aquela conta. */
  async #settle(
    session: number,
    intent: OrderIntent,
    result: SubmissionState
  ): Promise<SubmissionState> {
    await this.#store.removeItem(storageKey(intent.userId)).catch(() => undefined);
    return this.#set(session, result);
  }

  /** Só altera a tela se a sessão ainda for a mesma em que a operação começou. */
  #set(session: number, value: SubmissionState): SubmissionState {
    if (session === this.#auth.generation()) this.#current.set({ session, value });
    return value;
  }

  async #load(session: number): Promise<void> {
    if (this.#current().session !== session) this.#set(session, IDLE);
    const user = this.#auth.user();
    if (!user) return;
    const raw = await this.#store.getItem(storageKey(String(user.id))).catch(() => null);
    const intent = parseIntent(raw, String(user.id));
    if (!intent || session !== this.#auth.generation() || this.state().kind !== 'idle') return;
    this.#set(session, { kind: 'unknown', intent, checking: true });
    await this.#reconcile(session, intent);
  }
}

/** Erros em que a API responde que não criou: validação, conflito, permissão, limite. */
function isRejectedBeforeCreation(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408
  );
}

function storageKey(userId: string): string {
  return `order_intent_${userId}`;
}

function parseIntent(raw: string | null, userId: string): OrderIntent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<OrderIntent>;
    return value.userId === userId &&
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
