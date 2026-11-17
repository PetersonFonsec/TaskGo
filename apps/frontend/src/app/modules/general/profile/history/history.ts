import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, type Observable, of, startWith, Subject, type Subscription, switchMap, tap, timer } from 'rxjs';

import { normalizeNavigationRole } from '@shared/components/ui/header/navigation.constant';
import { sessionUserId } from '@shared/guards/session-user/session-user.guard';
import { RolesBack } from '@shared/enums/roles.enum';
import { Order } from '@shared/service/order/order';
import { OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgOrderListComponent, TgOrderRowComponent } from '@shared/design-system/order-row/tg-order-row.component';
import type { TgOrderPerspective, TgOrderStatusAction } from '@shared/design-system/order-row/tg-order-status';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TgTabComponent, TgTabsComponent } from '@shared/design-system/tabs/tg-tabs.component';
import type { TgIconName } from '@taskgo/icons';
import { orderTabs } from './order-tabs';

interface EmptyCopy {
  icon: TgIconName;
  title: string;
  text: string;
  /** Leva à busca (só no cliente). */
  search?: boolean;
}

/**
 * Status que mostram que a troca ainda não chegou à lista: o de antes da
 * ação. Qualquer outro (o esperado, um posterior ou um cancelamento) vale
 * como lista em dia para aquele pedido.
 */
const STATUS_BEFORE: Record<TgOrderStatusAction, readonly string[]> = {
  EM_DESLOCAMENTO: ['AGENDADO'],
  EM_ANDAMENTO: ['AGENDADO', 'EM_DESLOCAMENTO'],
};

/** Quantas listas conferem uma troca antes de desistir, e a espera antes de cada nova tentativa. */
export const RECONCILE_ATTEMPTS = 3;
export const RECONCILE_RETRY_MS: readonly number[] = [1000, 2000];

const EMPTY_COPY: Record<string, EmptyCopy> = {
  ativos: {
    icon: 'calendar-blank',
    title: 'Nenhum pedido em andamento',
    text: 'Quando você contratar um serviço, ele aparece aqui até ser concluído.',
    search: true,
  },
  concluidos: { icon: 'check', title: 'Nenhum serviço concluído ainda', text: 'Os serviços que você confirmar como concluídos ficam aqui.' },
  cancelados: { icon: 'x', title: 'Nenhum pedido cancelado', text: 'Pedidos cancelados ou recusados aparecem aqui.' },
  solicitacoes: {
    icon: 'hourglass',
    title: 'Nenhuma solicitação agora',
    text: 'Quando um cliente pedir um serviço seu, ele aparece aqui para você responder.',
  },
  agendados: { icon: 'calendar-blank', title: 'Nenhum atendimento agendado', text: 'Os pedidos que você aceitar ficam aqui até serem concluídos.' },
  historico: { icon: 'receipt', title: 'Seu histórico está vazio', text: 'Atendimentos concluídos, cancelados e recusados ficam aqui.' },
};

/**
 * Pedidos (Etapa 10): todos os pedidos de quem está logado, em abas do
 * Design System. A aba fica na URL (`?aba=`), para voltar ao mesmo lugar.
 * O prestador avança o atendimento ("Estou a caminho", "Iniciar serviço")
 * direto na linha.
 */
@Component({
  selector: 'app-history',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgButtonComponent,
    TgEmptyStateComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgOrderListComponent,
    TgOrderRowComponent,
    TgSkeletonComponent,
    TgTabComponent,
    TgTabsComponent,
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class History {
  readonly #order = inject(Order);
  readonly #session = inject(UserLoggedService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly searchLink = '/customer/search';
  readonly empty = EMPTY_COPY;

  readonly perspective = computed<TgOrderPerspective>(() =>
    normalizeNavigationRole(this.#session.user()?.user?.type) === RolesBack.PROVIDER ? 'provider' : 'customer',
  );

  /**
   * Quem está na sessão: o id (nunca o da URL) e o modo. Muda quando a
   * sessão muda (outra conta, cliente/prestador, logout); a igualdade por
   * valor evita recarregar quando a sessão é regravada com os mesmos dados.
   */
  readonly #identity = computed<Identity | null>(
    () => {
      const userId = sessionUserId(this.#session.user());
      return userId ? { userId, perspective: this.perspective() } : null;
    },
    { equal: (a, b) => a?.userId === b?.userId && a?.perspective === b?.perspective },
  );

  readonly lead = computed(() =>
    this.perspective() === 'provider'
      ? 'Responda solicitações e acompanhe seus atendimentos.'
      : 'Acompanhe seus serviços, do pedido à avaliação.',
  );

  readonly orders = signal<OrdersResponse>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly tabs = computed(() => orderTabs(this.orders(), this.perspective()));

  /** "Buscar serviço" no topo: só para o cliente, com a lista carregada e algum pedido (ou na falha). */
  readonly showSearch = computed(
    () => this.perspective() === 'customer' && !this.loading() && (this.error() || this.orders().length > 0),
  );

  /** Aba da URL; sem ela (ou com uma que não existe), as abas mostram a primeira. */
  readonly #query = toSignal(this.#route.queryParamMap.pipe(map((params) => params.get('aba'))), {
    initialValue: null,
  });
  readonly tab = computed(() => {
    const value = this.#query();
    return this.tabs().some((tab) => tab.value === value) ? value! : this.tabs()[0].value;
  });

  /**
   * Pedidos com troca de status em curso (o botão fica em carregando). Cada
   * pedido tem o seu estado: ele entra ao pedir a troca e só sai pela
   * própria falha ou por uma lista pedida depois da própria confirmação.
   * A conclusão de um pedido nunca solta outro.
   */
  readonly updating = signal<ReadonlySet<string>>(new Set());
  readonly actionError = signal('');
  /**
   * A API confirmou a troca, mas a lista seguiu mostrando o status antigo
   * depois de todas as tentativas. O alerta oferece recarregar a lista.
   */
  readonly reconcileFailed = signal(false);

  /** Trocas de status com a chamada à API em curso, por pedido. */
  readonly #inFlight = new Map<string, Subscription>();
  /**
   * Trocas que a API aceitou e que a lista ainda não mostra, por pedido. Só
   * uma lista pedida depois da confirmação (`afterSeq` ou mais nova) pode
   * soltar o pedido, e só se trouxer o pedido sem o status antigo. Cada lista
   * assim que ainda traz o status antigo (ou falha) conta uma tentativa.
   */
  readonly #awaiting = new Map<string, PendingReconciliation>();
  /** Nova consulta agendada para conferir trocas pendentes. */
  #retry: Subscription | null = null;
  /** Número da última lista pedida. */
  #seq = 0;
  readonly #loads = new Subject<{ silent: boolean }>();

  constructor() {
    // Uma carga por sessão. Trocar de sessão cancela a lista e as trocas de
    // status da anterior e limpa os pedidos dela antes de pedir os novos.
    // Dentro da sessão, cada lista cancela a anterior (switchMap): uma
    // resposta antiga nunca sobrescreve a atual.
    toObservable(this.#identity)
      .pipe(
        switchMap((identity) => {
          this.#resetSession();
          if (!identity) {
            this.error.set(true);
            this.loading.set(false);
            return EMPTY;
          }
          return this.#loads.pipe(
            startWith({ silent: false }),
            map(({ silent }) => ({ silent, seq: ++this.#seq })),
            // Uma lista nova já confere as trocas pendentes: a agendada sai.
            tap(() => this.#cancelRetry()),
            switchMap(({ silent, seq }) => {
              if (!silent) {
                this.loading.set(true);
                this.error.set(false);
              }
              return this.#fetch(identity).pipe(
                map((orders): LoadResult => ({ ok: true, orders, silent, seq })),
                catchError(() => of<LoadResult>({ ok: false, silent, seq })),
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.#applyLoad(result));

    inject(DestroyRef).onDestroy(() => this.#cancelUpdates());
  }

  /** Recarrega (no "Tentar de novo") os pedidos da sessão atual. */
  load(): void {
    this.reconcileFailed.set(false);
    this.#loads.next({ silent: false });
  }

  selectTab(value: string | undefined): void {
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { aba: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * "Estou a caminho" ou "Iniciar serviço". Pedidos diferentes podem trocar
   * ao mesmo tempo; o mesmo pedido, não (outro clique enquanto corre é
   * ignorado). Deu certo: pede a lista em silêncio e o botão só solta
   * quando ela mostrar o pedido sem o status antigo (ou depois de
   * `RECONCILE_ATTEMPTS` tentativas, com aviso). Falhou: solta só este
   * pedido e mostra o motivo.
   */
  advance(orderId: string, status: TgOrderStatusAction): void {
    if (this.updating().has(orderId) || !this.#identity()) return;
    this.actionError.set('');
    this.#mark(orderId, true);
    const request = this.#order.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        this.#inFlight.delete(orderId);
        // Registra antes de pedir: a lista pedida agora recebe o número #seq + 1.
        this.#awaiting.set(orderId, { expected: status, afterSeq: this.#seq + 1, attempts: 0 });
        this.#loads.next({ silent: true });
      },
      error: (error: unknown) => {
        this.#inFlight.delete(orderId);
        this.#mark(orderId, false);
        this.actionError.set(apiMessage(error) ?? 'Não foi possível atualizar o atendimento. Tente de novo.');
      },
    });
    // Uma resposta síncrona já terminou acima; só guarda a chamada que segue em curso.
    if (!request.closed) this.#inFlight.set(orderId, request);
  }

  #fetch({ userId, perspective }: Identity): Observable<OrdersResponse> {
    return perspective === 'provider' ? this.#order.getOrderByProvider(userId) : this.#order.getOrderByClient(userId);
  }

  #applyLoad(result: LoadResult): void {
    if (result.ok) {
      this.orders.set(result.orders);
      this.error.set(false);
    } else if (!result.silent) {
      this.orders.set([]);
      this.error.set(true);
    }
    this.loading.set(false);

    this.#reconcile(result);
  }

  /**
   * Confere as trocas pendentes com esta lista. Lista pedida antes da
   * confirmação de um pedido não conta para ele. Lista que mostra o pedido
   * sem o status antigo solta o pedido. Lista com o status antigo, ou que
   * falhou, gasta uma tentativa: sobrando tentativas, agenda outra consulta;
   * sem tentativas, solta o pedido e avisa, com a opção de recarregar.
   */
  #reconcile(result: LoadResult): void {
    let retryAfter = -1;
    let gaveUp = false;
    for (const [id, pending] of [...this.#awaiting]) {
      if (result.seq < pending.afterSeq) continue;
      if (result.ok && reflects(result.orders, id, pending.expected)) {
        this.#awaiting.delete(id);
        this.#mark(id, false);
        continue;
      }
      pending.attempts += 1;
      if (pending.attempts >= RECONCILE_ATTEMPTS) {
        this.#awaiting.delete(id);
        this.#mark(id, false);
        gaveUp = true;
      } else {
        retryAfter = Math.max(retryAfter, RECONCILE_RETRY_MS[pending.attempts - 1] ?? 0);
      }
    }
    if (gaveUp) this.reconcileFailed.set(true);
    if (retryAfter >= 0 && !this.#retry) {
      this.#retry = timer(retryAfter).subscribe(() => {
        this.#retry = null;
        this.#loads.next({ silent: true });
      });
    }
  }

  #cancelRetry(): void {
    this.#retry?.unsubscribe();
    this.#retry = null;
  }

  #mark(orderId: string, busy: boolean): void {
    this.updating.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }

  #cancelUpdates(): void {
    for (const request of this.#inFlight.values()) request.unsubscribe();
    this.#inFlight.clear();
    this.#awaiting.clear();
    this.#cancelRetry();
  }

  /** Nova sessão: nada da anterior fica à vista nem em curso. */
  #resetSession(): void {
    this.#cancelUpdates();
    this.updating.set(new Set());
    this.actionError.set('');
    this.reconcileFailed.set(false);
    this.orders.set([]);
    this.loading.set(true);
    this.error.set(false);
  }
}

interface Identity {
  userId: string;
  perspective: TgOrderPerspective;
}

/** Troca aceita pela API, à espera de aparecer na lista. */
interface PendingReconciliation {
  /** O status pedido. */
  expected: TgOrderStatusAction;
  /** Número da primeira lista pedida depois da confirmação. */
  afterSeq: number;
  /** Listas (dessa em diante) que ainda não mostraram a troca. */
  attempts: number;
}

/**
 * A lista já mostra a troca do pedido: ele não está mais no status de antes
 * da ação. Pedido fora da lista também conta, porque não há status antigo à
 * vista para corrigir.
 */
function reflects(orders: OrdersResponse, orderId: string, expected: TgOrderStatusAction): boolean {
  const order = orders.find((item) => item.id === orderId);
  return !order || !STATUS_BEFORE[expected].includes(order.status);
}

type LoadResult =
  | { ok: true; orders: OrdersResponse; silent: boolean; seq: number }
  | { ok: false; silent: boolean; seq: number };

/** A mensagem que a API manda no erro (`{ message }`), quando é um texto. */
function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message: unknown = body.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}
