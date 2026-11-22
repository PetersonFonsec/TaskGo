import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, Subject, switchMap } from 'rxjs';

import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TgClock } from '@shared/design-system/tg-clock';
import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { finishServiceView } from './finish-service.view';

/** Limite de `providerNotes` no DTO (`finish-order.dto.ts`). */
export const NOTES_MAX_LENGTH = 1000;
/** Quanto a confirmação fica na tela antes de voltar aos detalhes do pedido. */
export const FINISH_REDIRECT_DELAY = 900;

type Result = { ok: true; value: OrderDetails } | { ok: false; notFound: boolean };

const NUMBER = new Intl.NumberFormat('pt-BR');

/** Mensagens da API que chegam em inglês (`finish-order.handler.ts`). */
const API_MESSAGES: Record<string, string> = {
  'Final price must equal the agreed paid amount':
    'O valor combinado não confere com o pagamento deste pedido. Fale com o suporte.',
};

/**
 * Finalizar serviço (Etapa 10), em `/orders/:id/finish`: o prestador revê o
 * atendimento, escreve observações para o cliente e envia a conclusão.
 * Endpoints de antes: GET /orders/:id e PATCH /orders/:id/finish. Só pedido
 * em andamento pode ser finalizado; o valor é o combinado, fixo.
 */
@Component({
  selector: 'app-finish-service-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './finish-service.page.html',
  styleUrl: './finish-service.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinishServicePage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);
  readonly #clock = inject(TgClock);
  readonly #destroyRef = inject(DestroyRef);

  readonly notesMax = NOTES_MAX_LENGTH;
  readonly form = new FormGroup({
    providerNotes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(NOTES_MAX_LENGTH)],
    }),
  });
  readonly notes = this.form.controls.providerNotes;
  readonly #notesValue = signal('');

  readonly order = signal<OrderDetails | null>(null);
  readonly loading = signal(true);
  /** Falha ao abrir o pedido: 'notFound' (404) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal('');
  /** A mensagem da API depois de enviar; com ela, a tela mostra a confirmação. */
  readonly finished = signal<string | null>(null);

  readonly view = computed(() => {
    const order = this.order();
    return order ? finishServiceView(order, this.#clock.now()) : null;
  });
  readonly orderId = computed(() => this.view()?.id ?? this.#id());
  readonly notesCount = computed(
    () => `${NUMBER.format(this.#notesValue().length)} de ${NUMBER.format(NOTES_MAX_LENGTH)} caracteres`,
  );
  readonly notesError = computed(() =>
    this.submitted() && this.#notesValue().length > NOTES_MAX_LENGTH
      ? `Use no máximo ${NUMBER.format(NOTES_MAX_LENGTH)} caracteres.`
      : '',
  );

  readonly #id = signal('');
  readonly #requests = new Subject<string>();
  #redirect: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.notes.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((value) => this.#notesValue.set(value));

    this.#requests
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          return this.#orders.getOrderDetails(id).pipe(
            map((order): Result => ({ ok: true, value: order })),
            catchError((error: unknown) =>
              of<Result>({ ok: false, notFound: error instanceof HttpErrorResponse && error.status === 404 }),
            ),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result.ok) {
          this.order.set(null);
          this.loadError.set(result.notFound ? 'notFound' : 'failed');
          return;
        }
        this.order.set(result.value);
      });

    this.#destroyRef.onDestroy(() => this.#clearRedirect());
  }

  ngOnInit(): void {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.#clearRedirect();
      this.#id.set(params.get('id') ?? '');
      this.order.set(null);
      this.submitted.set(false);
      this.submitError.set('');
      this.finished.set(null);
      this.notes.reset('');
      this.load();
    });
  }

  /** Abre (ou, no "Tentar de novo", reabre) o pedido. */
  load(): void {
    this.#requests.next(this.#id());
  }

  /** Envia a conclusão: um envio por vez, só em andamento e com o valor combinado. */
  submit(): void {
    const view = this.view();
    if (this.submitting() || this.finished() !== null || !view?.canFinish || view.amount === null) return;
    this.submitted.set(true);
    this.submitError.set('');
    if (this.notes.invalid) return;

    const notes = this.notes.value.trim();
    this.submitting.set(true);
    this.#orders
      .finishOrder(view.id, {
        finalPrice: view.amount,
        providerNotes: notes || undefined,
        photos: [],
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.finished.set(response.message?.trim() || 'Conclusão enviada para o cliente confirmar.');
          // O selo passa a mostrar o status novo que a API devolveu.
          const status = response.status || 'AGUARDANDO_CONFIRMACAO_CLIENTE';
          this.order.update((order) => (order ? { ...order, status } : order));
          const id = response.id || view.id;
          this.#redirect = setTimeout(() => void this.#router.navigate(['/orders', id]), FINISH_REDIRECT_DELAY);
        },
        error: (error: unknown) =>
          this.submitError.set(apiMessage(error) ?? 'Verifique sua conexão e tente de novo.'),
      });
  }

  #clearRedirect(): void {
    if (this.#redirect !== null) clearTimeout(this.#redirect);
    this.#redirect = null;
  }
}

/** A mensagem da API (texto ou lista do ValidationPipe), se houver. */
function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (!body || typeof body !== 'object' || !('message' in body)) return null;
  const message: unknown = body.message;
  if (typeof message === 'string' && message.trim()) return API_MESSAGES[message.trim()] ?? message.trim();
  if (Array.isArray(message)) {
    const text = message.filter((item): item is string => typeof item === 'string' && !!item.trim()).join(' ');
    return text || null;
  }
  return null;
}
