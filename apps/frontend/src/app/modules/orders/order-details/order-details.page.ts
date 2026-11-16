import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import type { TgOrderPerspective, TgOrderStatusAction } from '@shared/design-system/order-row/tg-order-status';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TgClock } from '@shared/design-system/tg-clock';
import { Roles, RolesBack } from '@shared/enums/roles.enum';
import { Order } from '@shared/service/order/order';
import { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { OrderTimelineComponent } from '../order-timeline/order-timeline';
import { orderDetailsView, orderExpiryNotice } from './order-details.view';

type Result<T> = { ok: true; value: T } | { ok: false; notFound: boolean };

/** E-mail de suporte de hoje (mantido na migração). */
const SUPPORT_EMAIL = 'suporte@proxi.com.br';

/**
 * Detalhes do pedido (Etapa 10), para o cliente e para o prestador: o
 * resumo com o próximo passo no topo, o pagamento e a linha do tempo. Só
 * tokens e componentes do DS; status e próximo passo pelo mapa do DS.
 */
@Component({
  selector: 'app-order-details-page',
  imports: [
    RouterLink,
    OrderTimelineComponent,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './order-details.page.html',
  styleUrl: './order-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);
  readonly #clock = inject(TgClock);
  readonly #destroyRef = inject(DestroyRef);

  readonly supportLink = `mailto:${SUPPORT_EMAIL}`;

  readonly perspective = computed<TgOrderPerspective>(() => {
    const type: unknown = this.#session.user()?.user?.type;
    return type === Roles.PROVIDER || type === RolesBack.PROVIDER ? 'provider' : 'customer';
  });
  readonly backLink = computed(() => (this.perspective() === 'provider' ? '/provider' : '/customer'));

  readonly order = signal<OrderDetails | null>(null);
  readonly loading = signal(true);
  /** Falha ao abrir o pedido: 'notFound' (404) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);
  /** A troca de status deu certo, mas a recarga falhou: o pedido fica à vista e bloqueado. */
  readonly syncError = signal(false);
  /** A recarga chegou sem confirmar a troca (ainda no status de antes): bloqueado, com "Tentar de novo". */
  readonly syncStale = signal(false);
  /** Troca de status em curso ou esperando a recarga confirmar. */
  readonly updating = signal(false);
  readonly actionError = signal('');

  readonly view = computed(() => {
    const order = this.order();
    return order ? orderDetailsView(order, this.perspective(), this.#clock.now()) : null;
  });
  readonly expiry = computed(() => {
    const order = this.order();
    return order ? orderExpiryNotice(order, this.perspective(), this.#clock.now()) : null;
  });

  #id = '';
  #seq = 0;
  /**
   * Troca aceita pela API esperando a recarga confirmar: `from` é o status
   * em que foi pedida e `afterSeq`, a primeira consulta pedida depois da
   * confirmação. O botão só solta quando uma resposta dessa consulta (ou
   * posterior) traz o pedido num status diferente de `from`.
   */
  #pending: { from: string; afterSeq: number } | null = null;
  readonly #requests = new Subject<{ id: string; silent: boolean; seq: number }>();

  constructor() {
    this.#requests
      .pipe(
        switchMap(({ id, silent, seq }) => {
          if (!silent) {
            this.loading.set(true);
            this.loadError.set(null);
          }
          return this.#orders.getOrderDetails(id).pipe(
            map((order): Result<OrderDetails> => ({ ok: true, value: order })),
            catchError((error: unknown) =>
              of<Result<OrderDetails>>({
                ok: false,
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              }),
            ),
            map((result) => ({ silent, seq, result })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ silent, seq, result }) => {
        if (!result.ok && silent && this.order()) {
          this.syncError.set(true);
          return;
        }
        this.loading.set(false);
        this.syncError.set(false);
        if (!result.ok) {
          this.order.set(null);
          this.loadError.set(result.notFound ? 'notFound' : 'failed');
          return;
        }
        this.order.set(result.value);
        this.loadError.set(null);
        this.#confirm(result.value, seq);
      });
  }

  ngOnInit(): void {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.#id = params.get('id') ?? '';
      this.#pending = null;
      this.order.set(null);
      this.updating.set(false);
      this.syncStale.set(false);
      this.actionError.set('');
      this.load();
    });
  }

  /** Abre (ou, no "Tentar de novo", reabre) o pedido com skeleton. */
  load(): void {
    this.#request(false);
  }

  /** "Tentar de novo" depois de uma troca de status: recarrega sem tirar o pedido da tela. */
  sync(): void {
    this.#request(true);
  }

  /**
   * "Estou a caminho" ou "Iniciar serviço". Um clique por vez; deu certo:
   * recarrega em silêncio e só solta o botão quando o pedido recarregado
   * sai do status em que a troca foi pedida.
   */
  advance(action: TgOrderStatusAction): void {
    const order = this.order();
    if (!order || this.updating()) return;
    const from = order.status;
    this.actionError.set('');
    this.updating.set(true);
    this.#orders
      .updateOrderStatus(order.id, action)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.#pending = { from, afterSeq: this.#seq + 1 };
          this.#request(true);
        },
        error: (error: unknown) => {
          this.updating.set(false);
          this.actionError.set(apiMessage(error) ?? 'Não foi possível atualizar o pedido. Tente de novo.');
        },
      });
  }

  #request(silent: boolean): void {
    this.#requests.next({ id: this.#id, silent, seq: ++this.#seq });
  }

  #confirm(order: OrderDetails, seq: number): void {
    const pending = this.#pending;
    if (!pending || seq < pending.afterSeq) return;
    if (order.status !== pending.from) {
      this.#pending = null;
      this.updating.set(false);
      this.syncStale.set(false);
    } else {
      this.syncStale.set(true);
    }
  }
}

function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message: unknown = body.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}
