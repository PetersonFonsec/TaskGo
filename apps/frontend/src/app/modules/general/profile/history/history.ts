import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { normalizeNavigationRole } from '@shared/components/ui/header/navigation.constant';
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

const EMPTY: Record<string, EmptyCopy> = {
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
export class History implements OnInit {
  readonly #order = inject(Order);
  readonly #session = inject(UserLoggedService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly searchLink = '/customer/search';
  readonly empty = EMPTY;

  readonly #userId = computed(() => {
    const id: unknown = this.#session.user()?.user?.id;
    return (typeof id === 'string' && id.trim()) || (typeof id === 'number' && Number.isFinite(id)) ? String(id) : null;
  });

  readonly perspective = computed<TgOrderPerspective>(() =>
    normalizeNavigationRole(this.#session.user()?.user?.type) === RolesBack.PROVIDER ? 'provider' : 'customer',
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

  /** Pedidos com troca de status em curso (o botão fica em carregando). */
  readonly updating = signal<ReadonlySet<string>>(new Set());
  readonly actionError = signal('');

  /** Cada carga cancela a anterior: uma resposta antiga nunca sobrescreve a atual. */
  readonly #requests = new Subject<{ userId: string; perspective: TgOrderPerspective; silent: boolean }>();

  constructor() {
    this.#requests
      .pipe(
        switchMap(({ userId, perspective, silent }) => {
          if (!silent) {
            this.loading.set(true);
            this.error.set(false);
          }
          const request =
            perspective === 'provider' ? this.#order.getOrderByProvider(userId) : this.#order.getOrderByClient(userId);
          return request.pipe(
            map((orders) => ({ ok: true as const, orders, silent })),
            catchError(() => of({ ok: false as const, silent })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.orders.set(result.orders);
          this.error.set(false);
        } else if (!result.silent) {
          this.orders.set([]);
          this.error.set(true);
        } else {
          this.actionError.set('O atendimento foi atualizado, mas a lista não. Recarregue a página para ver o status novo.');
        }
        this.loading.set(false);
        // A recarga terminou: a linha já mostra o status novo (ou o aviso explica).
        this.updating.set(new Set());
      });
  }

  ngOnInit(): void {
    this.load();
  }

  /** Carrega (ou recarrega, no "Tentar de novo") os pedidos de quem está logado. */
  load(silent = false): boolean {
    const userId = this.#userId();
    if (userId) {
      this.#requests.next({ userId, perspective: this.perspective(), silent });
      return true;
    }
    this.orders.set([]);
    this.error.set(true);
    this.loading.set(false);
    return false;
  }

  selectTab(value: string | undefined): void {
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { aba: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** "Estou a caminho" ou "Iniciar serviço": um pedido por vez; o botão só solta com a lista nova. */
  advance(orderId: string, status: TgOrderStatusAction): void {
    if (this.updating().has(orderId)) return;
    this.actionError.set('');
    this.updating.update((ids) => new Set(ids).add(orderId));
    this.#order
      .updateOrderStatus(orderId, status)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          if (!this.load(true)) this.#release(orderId);
        },
        error: (error: unknown) => {
          this.#release(orderId);
          this.actionError.set(apiMessage(error) ?? 'Não foi possível atualizar o atendimento. Tente de novo.');
        },
      });
  }

  #release(orderId: string): void {
    this.updating.update((ids) => {
      const next = new Set(ids);
      next.delete(orderId);
      return next;
    });
  }
}

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
