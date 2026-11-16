import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, Subject, switchMap } from 'rxjs';

import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Order } from '@shared/service/order/order';
import { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';
import { orderPaymentView } from './order-payment.view';

/** Intervalo da conferência automática enquanto o Pix está pendente (o mesmo de antes). */
const CHECK_INTERVAL_MS = 15_000;
/** E-mail de suporte de hoje (mantido na migração). */
const SUPPORT_EMAIL = 'suporte@proxi.com.br';

type Loaded = { order: OrderDetails; payment: OrderPaymentResponse | null };

/**
 * Pagamento do pedido (Etapa 10), só para o cliente e só Pix: o resumo com o
 * total que a API cobra, o QR Code com o código copia e cola e a
 * confirmação. Enquanto o Pix está pendente, a tela confere sozinha a cada
 * 15 s; "Já paguei" confere na hora. Só tokens e componentes do DS.
 */
@Component({
  selector: 'app-order-payment-page',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './order-payment.page.html',
  styleUrl: './order-payment.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPaymentPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #orders = inject(Order);
  readonly #destroyRef = inject(DestroyRef);

  readonly supportLink = `mailto:${SUPPORT_EMAIL}`;

  readonly order = signal<OrderDetails | null>(null);
  readonly payment = signal<OrderPaymentResponse | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<'notFound' | 'failed' | null>(null);
  /** "Gerar Pix" em curso. */
  readonly creating = signal(false);
  /** "Já paguei" em curso. */
  readonly checking = signal(false);
  /** "Já paguei" conferiu e o Pix ainda está pendente. */
  readonly stillPending = signal(false);
  readonly actionError = signal('');
  readonly copyState = signal<'idle' | 'copied' | 'failed'>('idle');
  /** Hora de referência para a validade do Pix; anda com a conferência automática. */
  readonly now = signal(new Date());

  readonly orderLink = computed(() => ['/orders', this.order()?.id ?? this.#id]);
  readonly view = computed(() => {
    const order = this.order();
    return order ? orderPaymentView(order, this.payment(), this.now()) : null;
  });

  #id = '';
  readonly #loads = new Subject<string>();
  #copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.#loads
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          return forkJoin({
            order: this.#orders.getOrderDetails(id),
            // Sem cobrança ainda (ou falha ao consultar): a tela oferece "Gerar Pix"; o backend devolve a cobrança existente.
            payment: this.#orders.getOrderPayment(id).pipe(catchError(() => of(null))),
          }).pipe(
            map((value): { ok: true; value: Loaded } => ({ ok: true, value })),
            catchError((error: unknown) =>
              of({ ok: false as const, notFound: error instanceof HttpErrorResponse && error.status === 404 }),
            ),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.now.set(new Date());
        if (!result.ok) {
          this.order.set(null);
          this.loadError.set(result.notFound ? 'notFound' : 'failed');
          return;
        }
        this.order.set(result.value.order);
        this.payment.set(result.value.payment);
      });

    this.#destroyRef.onDestroy(() => {
      if (this.#copyTimer !== null) clearTimeout(this.#copyTimer);
    });
    // No servidor (SSR) não agenda nada, para não segurar a renderização.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const timer = setInterval(() => {
      this.now.set(new Date());
      if (this.view()?.pix === 'pending') this.#check(false);
    }, CHECK_INTERVAL_MS);
    this.#destroyRef.onDestroy(() => clearInterval(timer));
  }

  ngOnInit(): void {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      if (id === this.#id && this.order()) return;
      this.#id = id;
      this.order.set(null);
      this.payment.set(null);
      this.actionError.set('');
      this.stillPending.set(false);
      this.copyState.set('idle');
      this.load();
    });
  }

  load(): void {
    this.#loads.next(this.#id);
  }

  /** "Gerar Pix": cria a cobrança (ou recebe a que já existe). */
  createPix(): void {
    const id = this.order()?.id;
    if (!id || this.creating()) return;
    this.actionError.set('');
    this.creating.set(true);
    this.#orders
      .createOrderPayment(id, { method: 'PIX' })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (payment) => {
          this.creating.set(false);
          if (id !== this.#id) return;
          this.now.set(new Date());
          this.payment.set(payment);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          if (id !== this.#id) return;
          this.actionError.set(apiMessage(error) ?? 'Não foi possível gerar o Pix. Tente de novo em instantes.');
        },
      });
  }

  /** "Já paguei": confere o pagamento na hora. */
  checkNow(): void {
    this.#check(true);
  }

  async copyCode(): Promise<void> {
    const code = this.view()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copyState.set('copied');
    } catch {
      this.copyState.set('failed');
    }
    if (this.#copyTimer !== null) clearTimeout(this.#copyTimer);
    this.#copyTimer = setTimeout(() => this.copyState.set('idle'), 3000);
  }

  #check(manual: boolean): void {
    const id = this.order()?.id;
    if (!id || this.checking()) return;
    if (manual) {
      this.checking.set(true);
      this.stillPending.set(false);
    }
    this.#orders
      .getOrderPayment(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (payment) => {
          if (manual) this.checking.set(false);
          if (id !== this.#id) return;
          this.now.set(new Date());
          this.payment.set(payment);
          if (manual) this.stillPending.set(this.view()?.pix === 'pending');
        },
        error: () => {
          if (manual) this.checking.set(false);
          if (id !== this.#id || !manual) return;
          this.actionError.set('Não foi possível conferir o pagamento. Tente de novo em instantes.');
        },
      });
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
