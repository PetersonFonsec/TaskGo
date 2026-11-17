import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, map, type Observable, of, startWith, Subject, type Subscription, switchMap } from 'rxjs';

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

  /** Trocas de status com a chamada à API em curso, por pedido. */
  readonly #inFlight = new Map<string, Subscription>();
  /**
   * Trocas que a API aceitou, por pedido: o número da primeira lista pedida
   * depois da confirmação. Qualquer resposta dessa lista (ou de uma mais
   * nova) solta o pedido; uma mais velha, não.
   */
  readonly #awaiting = new Map<string, number>();
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
   * quando ela chega. Falhou: solta só este pedido e mostra o motivo.
   */
  advance(orderId: string, status: TgOrderStatusAction): void {
    if (this.updating().has(orderId) || !this.#identity()) return;
    this.actionError.set('');
    this.#mark(orderId, true);
    const request = this.#order.updateOrderStatus(orderId, status).subscribe({
      next: () => {
        this.#inFlight.delete(orderId);
        // Registra antes de pedir: a lista pedida agora recebe o número #seq + 1.
        this.#awaiting.set(orderId, this.#seq + 1);
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

    // Solta só os pedidos que esta lista confirma (pedida depois da troca deles).
    const settled = [...this.#awaiting].filter(([, seq]) => result.seq >= seq).map(([id]) => id);
    for (const id of settled) {
      this.#awaiting.delete(id);
      this.#mark(id, false);
    }
    if (!result.ok && result.silent && settled.length) {
      this.actionError.set('O atendimento foi atualizado, mas a lista não. Recarregue a página para ver o status novo.');
    }
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
  }

  /** Nova sessão: nada da anterior fica à vista nem em curso. */
  #resetSession(): void {
    this.#cancelUpdates();
    this.updating.set(new Set());
    this.actionError.set('');
    this.orders.set([]);
    this.loading.set(true);
    this.error.set(false);
  }
}

interface Identity {
  userId: string;
  perspective: TgOrderPerspective;
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
