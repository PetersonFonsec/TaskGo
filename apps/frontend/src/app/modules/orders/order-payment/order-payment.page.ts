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
import { catchError, forkJoin, map, of, Subject, switchMap, throwError } from 'rxjs';

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
  /**
   * Geração da navegação: muda a cada pedido aberto (inclusive A → B → A).
   * Toda operação guarda a geração em que começou e é ignorada se ela mudou.
   */
  #nav = 0;
  /** Ordem das leituras do pagamento: só a mais nova que já chegou vale. */
  #paymentSeq = 0;
  #appliedSeq = 0;
  /** Conferência automática em curso (evita outra por cima). */
  #autoChecking = false;
  readonly #loads = new Subject<string>();
  #copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.#loads
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          const seq = ++this.#paymentSeq;
          return forkJoin({
            order: this.#orders.getOrderDetails(id),
            // GET /orders/:id/payment responde 404 "Pagamento ainda não iniciado" quando não há
            // cobrança: só isso libera "Gerar Pix". Qualquer outra falha deixa a existência da
            // cobrança desconhecida, e a tela mostra o erro com "Tentar de novo".
            payment: this.#orders
              .getOrderPayment(id)
              .pipe(catchError((error: unknown) => (isNotFound(error) ? of(null) : throwError(() => error)))),
          }).pipe(
            map((value): { ok: true; value: Loaded; seq: number } => ({ ok: true, value, seq })),
            catchError((error: unknown) => of({ ok: false as const, notFound: isNotFound(error) })),
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
        this.#applyPayment(result.seq, result.value.payment);
      });

    this.#destroyRef.onDestroy(() => this.#clearCopyTimer());
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
      // Nova navegação: o que estava em curso no pedido anterior deixa de valer.
      this.#nav++;
      this.#autoChecking = false;
      this.#clearCopyTimer();
      this.order.set(null);
      this.payment.set(null);
      this.creating.set(false);
      this.checking.set(false);
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
    const nav = this.#nav;
    const seq = ++this.#paymentSeq;
    this.actionError.set('');
    this.creating.set(true);
    // A criação não é repetida sozinha: se a navegação mudar, a resposta é só ignorada
    // (o backend devolve a cobrança existente numa próxima tentativa).
    this.#orders
      .createOrderPayment(id, { method: 'PIX' })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (payment) => {
          if (nav !== this.#nav) return;
          this.creating.set(false);
          this.#applyPayment(seq, payment);
        },
        error: (error: unknown) => {
          if (nav !== this.#nav) return;
          this.creating.set(false);
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
    const nav = this.#nav;
    let copied: boolean;
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch {
      copied = false;
    }
    // A cópia terminou depois de abrir outro pedido: o resultado (sucesso ou falha) não vale aqui.
    if (nav !== this.#nav) return;
    this.copyState.set(copied ? 'copied' : 'failed');
    this.#clearCopyTimer();
    this.#copyTimer = setTimeout(() => {
      this.#copyTimer = null;
      if (nav === this.#nav) this.copyState.set('idle');
    }, 3000);
  }

  /**
   * Confere o pagamento. A manual ("Já paguei") vale mesmo com uma automática em curso;
   * a automática não começa se já houver uma conferência em curso. Cada leitura tem um
   * número de ordem, e uma resposta mais velha do que a última aplicada é descartada,
   * para um "Pago" não voltar a "Aguardando pagamento".
   */
  #check(manual: boolean): void {
    const id = this.order()?.id;
    if (!id || this.checking()) return;
    if (!manual && this.#autoChecking) return;
    const nav = this.#nav;
    const seq = ++this.#paymentSeq;
    if (manual) {
      this.checking.set(true);
      this.stillPending.set(false);
    } else {
      this.#autoChecking = true;
    }
    this.#orders
      .getOrderPayment(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (payment) => {
          if (nav !== this.#nav) return;
          if (manual) this.checking.set(false);
          else this.#autoChecking = false;
          const applied = this.#applyPayment(seq, payment);
          if (manual) this.stillPending.set(applied && this.view()?.pix === 'pending');
        },
        error: () => {
          if (nav !== this.#nav) return;
          if (!manual) {
            this.#autoChecking = false;
            return;
          }
          this.checking.set(false);
          this.actionError.set('Não foi possível conferir o pagamento. Tente de novo em instantes.');
        },
      });
  }

  /** Aplica uma leitura do pagamento se ela for mais nova que a última aplicada. */
  #applyPayment(seq: number, payment: OrderPaymentResponse | null): boolean {
    // O backend nunca tira um pagamento de pago ou encerrado (reconcilePayment). Então uma
    // leitura final vale mesmo se chegar fora de ordem, e uma não final nunca desfaz uma final.
    const current = isFinal(this.payment());
    const incoming = isFinal(payment);
    if (current && !incoming) return false;
    if (seq <= this.#appliedSeq && !(incoming && !current)) return false;
    this.#appliedSeq = Math.max(this.#appliedSeq, seq);
    this.now.set(new Date());
    this.payment.set(payment);
    return true;
  }

  #clearCopyTimer(): void {
    if (this.#copyTimer !== null) clearTimeout(this.#copyTimer);
    this.#copyTimer = null;
  }
}

/** Pago ou encerrado no backend (paidStatuses e terminalStatuses de payments/payment-state.ts). */
const FINAL_STATUSES = new Set(['PAGO', 'CAPTURED', 'RELEASED', 'CANCELADO', 'CANCELED', 'REEMBOLSADO', 'REFUNDED']);

function isFinal(payment: OrderPaymentResponse | null): boolean {
  return !!payment && FINAL_STATUSES.has(payment.status);
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
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
