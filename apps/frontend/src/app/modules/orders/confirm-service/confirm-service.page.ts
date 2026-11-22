import { HttpErrorResponse } from '@angular/common/http';
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
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgDialogComponent } from '@shared/design-system/dialog/tg-dialog.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { tgOrderStatus, tgOrderStatusIcon } from '@shared/design-system/order-row/tg-order-status';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { AWAITING_CONFIRMATION, confirmServiceView } from './confirm-service.view';

type LoadResult = { ok: true; order: OrderDetails } | { ok: false; error: LoadError };
export type LoadError = 'notFound' | 'forbidden' | 'failed';

/** Por que a confirmação não está disponível para este pedido. */
export interface ConfirmBlock {
  title: string;
  body: string;
  /** Pedido concluído e ainda sem avaliação: oferece "Avaliar atendimento". */
  review: boolean;
}

const NOT_CLIENT = 'Apenas o cliente deste pedido pode confirmar a conclusão.';
const CONFIRM_FAILED = 'Não foi possível confirmar o serviço. Tente de novo.';

/**
 * Confirmar conclusão (Etapa 10): o cliente confere o que o prestador
 * informou ao finalizar (resumo, valores, fotos) e confirma, o que conclui
 * o pedido e libera o pagamento. A confirmação passa por um `tg-dialog`.
 * Só tokens e componentes do DS.
 */
@Component({
  selector: 'app-confirm-service-page',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgDialogComponent,
    TgEmptyStateComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './confirm-service.page.html',
  styleUrl: './confirm-service.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmServicePage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);

  readonly order = signal<OrderDetails | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<LoadError | null>(null);
  readonly confirming = signal(false);
  readonly confirmError = signal('');
  /** Resposta da confirmação: a mensagem da API e o id para avaliar. */
  readonly confirmed = signal<{ id: string; message: string } | null>(null);

  readonly orderId = signal('');
  readonly view = computed(() => {
    const order = this.order();
    return order ? confirmServiceView(order) : null;
  });
  readonly status = computed(() => {
    const status = this.confirmed() ? 'CONCLUIDO' : (this.order()?.status ?? '');
    return { ...tgOrderStatus(status, 'customer'), icon: tgOrderStatusIcon(status) };
  });
  readonly block = computed<ConfirmBlock | null>(() => {
    const order = this.order();
    if (!order || this.confirmed()) return null;
    const userId: unknown = this.#session.user()?.user?.id;
    if (userId === undefined || userId === null || String(userId) !== String(order.client?.id)) {
      return { title: 'Confirmação indisponível', body: NOT_CLIENT, review: false };
    }
    const eligibility = order.confirmationEligibility;
    if (eligibility && !eligibility.canConfirm) {
      return {
        title: eligibility.hasOpenDispute
          ? 'Este pedido está em análise'
          : 'Confirmação indisponível',
        body: eligibility.reason?.trim() || 'A confirmação não está disponível para este pedido.',
        review: false,
      };
    }
    switch (order.status) {
      case AWAITING_CONFIRMATION:
        return null;
      case 'CONCLUIDO':
        return {
          title: 'Este serviço já foi confirmado',
          body: 'A conclusão deste pedido já foi registrada.',
          review: !order.review,
        };
      case 'DISPUTA':
        return {
          title: 'Este pedido está em análise',
          body: 'Aguarde a análise do problema reportado antes de confirmar.',
          review: false,
        };
      default:
        return {
          title: 'Este pedido não está aguardando sua confirmação',
          body: 'A confirmação fica disponível depois que o prestador finalizar o serviço.',
          review: false,
        };
    }
  });

  private readonly dialog = viewChild<TgDialogComponent>('confirmDialog');
  private readonly doneTitle = viewChild<ElementRef<HTMLElement>>('doneTitle');

  readonly #requests = new Subject<string>();
  #started = false;

  constructor() {
    this.#requests
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          return this.#orders.getOrderDetails(id).pipe(
            map((order): LoadResult => ({ ok: true, order })),
            catchError((error: unknown) => of<LoadResult>({ ok: false, error: loadError(error) })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result.ok) {
          this.order.set(result.order);
        } else {
          this.order.set(null);
          this.loadError.set(result.error);
        }
      });
  }

  ngOnInit(): void {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      if (this.#started && id === this.orderId()) return;
      this.#started = true;
      this.orderId.set(id);
      this.order.set(null);
      this.confirming.set(false);
      this.confirmError.set('');
      this.confirmed.set(null);
      this.load();
    });
  }

  /** Abre (ou, no "Tentar de novo", reabre) o pedido com skeleton. */
  load(): void {
    this.#requests.next(this.orderId());
  }

  /** "Confirmar conclusão": pede a confirmação no diálogo. */
  ask(): void {
    this.confirmError.set('');
    this.dialog()?.open();
  }

  /** "Confirmar" no diálogo. Um envio por vez; o diálogo fica preso até a resposta. */
  confirm(): void {
    const order = this.order();
    if (!order || this.confirming() || this.block()) return;
    const id = this.orderId();
    this.confirming.set(true);
    this.confirmError.set('');
    this.#orders
      .confirmOrderCompletion(order.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          if (id !== this.orderId()) return;
          this.confirming.set(false);
          this.dialog()?.close();
          this.order.set({ ...order, status: 'CONCLUIDO' });
          this.confirmed.set({
            id: response?.id || order.id,
            message: response?.message?.trim() || 'Serviço confirmado com sucesso.',
          });
          afterNextRender(
            { write: () => this.doneTitle()?.nativeElement.focus() },
            { injector: this.#injector },
          );
        },
        error: (error: unknown) => {
          if (id !== this.orderId()) return;
          this.confirming.set(false);
          this.dialog()?.close();
          this.confirmError.set(apiMessage(error) ?? CONFIRM_FAILED);
        },
      });
  }
}

function loadError(error: unknown): LoadError {
  if (!(error instanceof HttpErrorResponse)) return 'failed';
  if (error.status === 404) return 'notFound';
  if (error.status === 403) return 'forbidden';
  return 'failed';
}

/** A mensagem da API (Nest: string ou lista de validação). */
export function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (!body || typeof body !== 'object' || !('message' in body)) return null;
  const message: unknown = body.message;
  const text = Array.isArray(message)
    ? message.find((item): item is string => typeof item === 'string')
    : message;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}
