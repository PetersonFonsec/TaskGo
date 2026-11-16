import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  type WritableSignal,
} from '@angular/core';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { environment } from '@environments/environment';

import { ProviderRevenueChartComponent } from '@shared/components/functional/provider-revenue-chart/provider-revenue-chart';
import { Order } from '@shared/service/order/order';
import { OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgAppointmentCardComponent } from '@shared/design-system/appointment-card/tg-appointment-card.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import {
  TgOrderListComponent,
  TgOrderRowComponent,
} from '@shared/design-system/order-row/tg-order-row.component';
import type { TgOrderStatusAction } from '@shared/design-system/order-row/tg-order-status';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TgClock } from '@shared/design-system/tg-clock';
import { ProviderHomeData } from './data';
import { PROVIDER_HOME_LIST_LIMIT, providerHomeAgenda } from './provider-home.agenda';
import { providerHomeEarnings } from './provider-home.earnings';

/**
 * Início do prestador (Etapa 9, tela piloto do Design System), no tema do
 * prestador: saudação com o resumo do dia, a agenda (o próximo atendimento,
 * as solicitações com "Responder" e os demais em curso), os ganhos, os
 * últimos serviços e os insights. Só tokens e componentes do DS.
 *
 * Duas fontes, que carregam em separado (a falha de uma não esconde a
 * outra): a agenda vem da lista de pedidos do prestador (decisão 3) e os
 * ganhos, do painel `/auth/provider-home`.
 */
@Component({
  selector: 'app-provider-home',
  imports: [
    RouterLink,
    ProviderRevenueChartComponent,
    TgAlertComponent,
    TgAppointmentCardComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgOrderListComponent,
    TgOrderRowComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderHomePage implements OnInit {
  #userLogged = inject(UserLoggedService);
  #order = inject(Order);
  #http = inject(HttpClient);
  #clock = inject(TgClock);
  #destroyRef = inject(DestroyRef);
  #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  #injector = inject(Injector);

  readonly receiptsLink = '/provider/recebimentos';
  readonly servicesLink = '/provider/services';

  /**
   * Id de quem está logado. A sessão vem do localStorage e pode estar vazia
   * ou incompleta: sem id, os pedidos não são consultados e a agenda mostra
   * o erro com "Tentar de novo".
   */
  readonly #userId = computed(() => {
    const id: unknown = this.#userLogged.user()?.user?.id;
    return (typeof id === 'string' && id.trim()) || (typeof id === 'number' && Number.isFinite(id))
      ? String(id)
      : null;
  });

  /** Primeiro nome de quem está logado; sem nome, só "Olá". */
  readonly firstName = computed(() => {
    const name: unknown = this.#userLogged.user()?.user?.name;
    return typeof name === 'string' ? (name.trim().split(/\s+/)[0] ?? '') : '';
  });

  readonly orders = signal<OrdersResponse>([]);
  readonly ordersLoading = signal(true);
  readonly ordersError = signal(false);
  readonly agenda = computed(() => providerHomeAgenda(this.orders(), this.#clock.now()));

  /**
   * As listas mostram 10 linhas e abrem o resto sob demanda: o prestador
   * não tem outra lista de pedidos no web, então nenhum pedido pode ficar
   * fora de alcance.
   */
  readonly listLimit = PROVIDER_HOME_LIST_LIMIT;
  readonly requestsExpanded = signal(false);
  readonly upcomingExpanded = signal(false);
  readonly visibleRequests = computed(() =>
    this.requestsExpanded() ? this.agenda().requests : this.agenda().requests.slice(0, this.listLimit),
  );
  readonly visibleUpcoming = computed(() =>
    this.upcomingExpanded() ? this.agenda().upcoming : this.agenda().upcoming.slice(0, this.listLimit),
  );

  /**
   * A recarga depois de uma troca de status falhou. A agenda anterior fica
   * à vista (a troca foi aceita pela API, então ela pode estar
   * desatualizada) e os pedidos trocados continuam bloqueados até uma
   * sincronização dar certo: nada de repetir a troca no status antigo.
   */
  readonly syncError = signal(false);
  /**
   * A recarga chegou, mas não confirma algum pedido trocado: ele ainda está
   * no status de antes ou não veio na lista. Ele continua bloqueado e o
   * aviso oferece "Tentar de novo".
   */
  readonly syncStale = signal(false);

  /** Pedidos com troca de status em curso (o botão fica em carregando). */
  readonly updating = signal<ReadonlySet<string>>(new Set());
  /** Erro da última troca de status, da API quando ela diz o motivo. */
  readonly actionError = signal('');

  readonly home = signal<ProviderHomeData | null>(null);
  readonly homeLoading = signal(true);
  readonly homeError = signal(false);
  readonly earnings = computed(() => {
    const home = this.home();
    return home ? providerHomeEarnings(home, this.#clock.now()) : null;
  });

  /** "Hoje você tem 2 atendimentos e 1 solicitação." Só com a agenda carregada. */
  readonly summary = computed(() => {
    if (this.ordersLoading() || this.ordersError()) return '';
    const { todayCount, requestCount } = this.agenda();
    const visits = `${todayCount} ${todayCount === 1 ? 'atendimento' : 'atendimentos'}`;
    const requests = `${requestCount} ${requestCount === 1 ? 'solicitação' : 'solicitações'}`;
    return `Hoje você tem ${visits} e ${requests}.`;
  });

  /**
   * Cada carga passa por aqui. O switchMap cancela a anterior: só a mais
   * recente muda os dados, o carregamento e o erro, e uma resposta antiga
   * nunca sobrescreve a atual. Ao destruir a tela, a carga em curso é
   * cancelada. A recarga depois de uma troca de status é silenciosa: a
   * agenda continua à vista, sem skeleton.
   */
  readonly #ordersRequests = new Subject<{ userId: string; silent: boolean; seq: number }>();
  readonly #homeRequests = new Subject<void>();
  /** Número da última consulta pedida: cada resposta sabe se foi pedida antes ou depois de uma troca. */
  #seq = 0;
  /**
   * Trocas que a API aceitou e que esperam a agenda confirmar, por pedido:
   * `from` é o status em que a troca foi pedida e `afterSeq`, a primeira
   * consulta pedida depois da confirmação da API. O pedido só é solto
   * quando uma resposta dessa consulta (ou posterior) o traz num status
   * diferente de `from`. O backend só troca a partir de `from` (atualização
   * condicional), então qualquer outro status quer dizer que o servidor já
   * saiu dele: o esperado, um posterior ou um cancelamento. Sumir da lista
   * não confirma nada.
   */
  readonly #pending = new Map<string, { from: string | null; afterSeq: number }>();

  constructor() {
    this.#ordersRequests
      .pipe(
        switchMap(({ userId, silent, seq }) => {
          if (!silent) {
            this.ordersLoading.set(true);
            this.ordersError.set(false);
          }
          return this.#order.getOrderByProvider(userId).pipe(
            map((orders): Result<OrdersResponse> => ({ ok: true, value: orders })),
            catchError(() => of<Result<OrdersResponse>>({ ok: false })),
            map((result) => ({ silent, seq, result })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ silent, seq, result }) => {
        if (!result.ok && silent) {
          // Recarga silenciosa: mantém a agenda, avisa e não solta os pedidos trocados.
          this.syncError.set(true);
          return;
        }
        this.orders.set(result.ok ? result.value : []);
        this.ordersError.set(!result.ok);
        this.ordersLoading.set(false);
        this.syncError.set(false);
        if (result.ok) this.#confirm(result.value, seq);
      });

    this.#homeRequests
      .pipe(
        switchMap(() => {
          this.homeLoading.set(true);
          this.homeError.set(false);
          return this.#http.get<ProviderHomeData>(`${environment.url}/auth/provider-home`).pipe(
            map((home): Result<ProviderHomeData> => ({ ok: true, value: home })),
            catchError(() => of<Result<ProviderHomeData>>({ ok: false })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.home.set(result.ok ? result.value : null);
        this.homeError.set(!result.ok);
        this.homeLoading.set(false);
      });
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadEarnings();
  }

  /** Carrega (ou recarrega, no "Tentar de novo") os pedidos de quem está logado. */
  loadOrders(): void {
    this.#load(false);
  }

  /** "Tentar de novo" depois de uma falha de sincronização: recarrega sem tirar a agenda da tela. */
  syncOrders(): void {
    this.#load(true);
  }

  /** Abre ou fecha as solicitações além das 10 primeiras; ao abrir, o foco vai para a primeira nova. */
  toggleRequests(): void {
    this.#toggle(this.requestsExpanded, '.provider-home__requests');
  }

  /** O mesmo para "Também na agenda". */
  toggleUpcoming(): void {
    this.#toggle(this.upcomingExpanded, '.provider-home__upcoming');
  }

  /** Carrega (ou recarrega) o painel de ganhos e insights. */
  loadEarnings(): void {
    this.#homeRequests.next();
  }

  /**
   * "Estou a caminho" ou "Iniciar serviço" no card ou numa linha. Um pedido
   * por vez: outro clique no mesmo pedido enquanto a troca corre é ignorado.
   * Deu certo: recarrega a agenda em silêncio e só solta o botão quando os
   * dados novos chegam (não dá para repetir a troca no status antigo).
   */
  advance(orderId: string, status: TgOrderStatusAction): void {
    if (this.updating().has(orderId)) return;
    this.actionError.set('');
    const from = this.orders().find((order) => order.id === orderId)?.status ?? null;
    this.updating.update((ids) => new Set(ids).add(orderId));
    this.#order
      .updateOrderStatus(orderId, status)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          // Registra antes de pedir: com uma resposta síncrona, ela já encontra a espera.
          this.#pending.set(orderId, { from, afterSeq: this.#seq + 1 });
          if (!this.#load(true)) {
            this.#pending.delete(orderId);
            this.#release([orderId]);
          }
        },
        error: (error: unknown) => {
          this.#release([orderId]);
          this.actionError.set(apiMessage(error) ?? 'Não foi possível atualizar o atendimento. Tente de novo.');
        },
      });
  }

  /** Pede a lista; sem id na sessão, mostra o erro. Devolve se pediu. */
  #load(silent: boolean): boolean {
    const userId = this.#userId();
    if (userId) {
      this.#ordersRequests.next({ userId, silent, seq: ++this.#seq });
      return true;
    }
    this.orders.set([]);
    this.ordersError.set(true);
    this.ordersLoading.set(false);
    return false;
  }

  #toggle(expanded: WritableSignal<boolean>, group: string): void {
    const opening = !expanded();
    expanded.set(opening);
    if (!opening) return;
    afterNextRender(
      () => {
        const first = this.#host.querySelector<HTMLElement>(
          `${group} li:nth-child(${this.listLimit + 1}) a.tg-order-row__link`,
        );
        first?.focus();
      },
      { injector: this.#injector },
    );
  }

  /**
   * Solta só os pedidos que esta resposta confirma. Uma resposta pedida
   * antes da confirmação da API não vale como prova (nem acende o aviso).
   * Uma resposta que valia como prova e não confirmou algum pedido (ainda
   * no status de antes ou fora da lista): aviso com "Tentar de novo".
   */
  #confirm(orders: OrdersResponse, seq: number): void {
    const confirmed: string[] = [];
    let stale = false;
    for (const [id, { from, afterSeq }] of this.#pending) {
      if (seq < afterSeq) continue;
      const order = orders.find((item) => item.id === id);
      if (order && (from === null || order.status !== from)) confirmed.push(id);
      else stale = true;
    }
    for (const id of confirmed) this.#pending.delete(id);
    this.#release(confirmed);
    this.syncStale.set(stale);
  }

  #release(ids: readonly string[]): void {
    if (!ids.length) return;
    this.updating.update((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }
}

type Result<T> = { ok: true; value: T } | { ok: false };

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
