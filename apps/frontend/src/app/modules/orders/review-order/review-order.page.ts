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
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap } from 'rxjs';

import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Order } from '@shared/service/order/order';
import { OrderDetails, ReviewTag } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import {
  COMMENT_MAX,
  RATINGS,
  ratingLabel,
  reviewAvailability,
  type ReviewAvailability,
  reviewErrors,
  reviewSummary,
} from './review-order.view';

type Result<T> = { ok: true; value: T } | { ok: false; notFound: boolean };

/** O que foi avaliado: o que a API devolveu ou o que já estava no pedido. */
interface SentReview {
  rating: number;
  comment: string | null;
}

/**
 * Avaliar atendimento (Etapa 10), só para o cliente, em `orders/:id/review`:
 * o resumo do atendimento e o formulário com nota (estrelas), destaques
 * (tags) e comentário opcional. Pedido de outra conta, ainda em curso,
 * fechado ou já avaliado mostra o motivo e "Ver pedido". Endpoints de
 * antes: GET /orders/:id, GET /review-tags e POST /orders/:id/review.
 */
@Component({
  selector: 'app-review-order-page',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './review-order.page.html',
  styleUrl: './review-order.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewOrderPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);

  readonly ratings = RATINGS;
  readonly stars = [1, 2, 3, 4, 5];
  readonly commentMax = COMMENT_MAX;

  readonly order = signal<OrderDetails | null>(null);
  readonly loading = signal(true);
  /** Falha ao abrir o pedido: 'notFound' (404) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);

  readonly tags = signal<ReviewTag[]>([]);
  readonly tagsLoading = signal(true);
  readonly tagsFailed = signal(false);

  readonly rating = signal(0);
  /** Estrela sob o ponteiro: só pinta a prévia, não muda a nota. */
  readonly hover = signal(0);
  readonly comment = signal('');
  readonly selectedTagIds = signal<string[]>([]);
  /** Já tentou enviar: as mensagens de validação passam a aparecer. */
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  /** A API respondeu 409: o pedido ganhou uma avaliação noutro lugar. */
  readonly conflict = signal(false);
  readonly sent = signal<SentReview | null>(null);

  readonly orderLink = computed(() => ['/orders', this.order()?.id ?? this.#id]);
  readonly summary = computed(() => {
    const order = this.order();
    return order ? reviewSummary(order) : null;
  });
  readonly availability = computed<ReviewAvailability | null>(() => {
    const order = this.order();
    if (!order) return null;
    if (this.conflict()) return 'reviewed';
    const id: unknown = this.#session.user()?.user?.id;
    return reviewAvailability(order, id === null || id === undefined ? null : String(id));
  });
  /**
   * A avaliação mostrada: a que acabou de ser enviada ou a que já existia no
   * pedido (null depois de um 409: a tela não a conhece).
   */
  readonly given = computed<SentReview | null>(() => {
    const sent = this.sent();
    if (sent) return sent;
    const review = this.order()?.review;
    return review
      ? { rating: Number(review.rating), comment: review.comment?.trim() || null }
      : null;
  });

  readonly errors = computed(() => reviewErrors(this.rating(), this.comment()));
  readonly ratingError = computed(() => (this.submitted() ? this.errors().rating : ''));
  readonly commentError = computed(() => (this.submitted() ? this.errors().comment : ''));
  readonly commentLength = computed(() => this.comment().trim().length);
  readonly ratingText = computed(() => ratingLabel(this.hover() || this.rating()));
  readonly preview = computed(() => this.hover() || this.rating());

  readonly starInputs = viewChildren<ElementRef<HTMLInputElement>>('star');
  readonly commentBox = viewChild<ElementRef<HTMLTextAreaElement>>('commentBox');
  readonly doneHeading = viewChild<ElementRef<HTMLElement>>('doneHeading');

  #id = '';
  readonly #loads = new Subject<string>();
  readonly #tagLoads = new Subject<void>();

  constructor() {
    this.#loads
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.loadError.set(null);
          return this.#orders.getOrderDetails(id).pipe(
            map((order): Result<OrderDetails> => ({ ok: true, value: order })),
            catchError((error: unknown) =>
              of<Result<OrderDetails>>({
                ok: false,
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              }),
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

    // As tags são opcionais: sem elas (falha ou lista vazia), o formulário segue sem a seção.
    this.#tagLoads
      .pipe(
        switchMap(() => {
          this.tagsLoading.set(true);
          this.tagsFailed.set(false);
          return this.#orders.getReviewTags().pipe(
            map(
              (tags): Result<ReviewTag[]> => ({ ok: true, value: Array.isArray(tags) ? tags : [] }),
            ),
            catchError(() => of<Result<ReviewTag[]>>({ ok: false, notFound: false })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.tagsLoading.set(false);
        this.tags.set(result.ok ? result.value : []);
        this.tagsFailed.set(!result.ok);
      });
  }

  ngOnInit(): void {
    this.#tagLoads.next();
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.#id = params.get('id') ?? '';
      this.#reset();
      this.load();
    });
  }

  /** Abre (ou, no "Tentar de novo", reabre) o pedido; as tags voltam se tinham falhado. */
  load(): void {
    if (this.tagsFailed()) this.#tagLoads.next();
    this.#loads.next(this.#id);
  }

  setRating(value: number): void {
    if (this.submitting()) return;
    this.rating.set(value);
  }

  setComment(value: string): void {
    this.comment.set(value);
  }

  isSelected(tagId: string): boolean {
    return this.selectedTagIds().includes(tagId);
  }

  toggleTag(tagId: string): void {
    if (this.submitting()) return;
    this.selectedTagIds.update((ids) =>
      ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId],
    );
  }

  /** Valida como o DTO; com erro, leva o foco ao primeiro campo inválido. Um envio por vez. */
  submit(event?: Event): void {
    event?.preventDefault();
    const order = this.order();
    if (!order || this.availability() !== 'open' || this.submitting() || this.sent()) return;
    this.submitted.set(true);
    this.submitError.set('');
    const errors = this.errors();
    if (errors.rating) {
      this.starInputs()[0]?.nativeElement.focus();
      return;
    }
    if (errors.comment) {
      this.commentBox()?.nativeElement.focus();
      return;
    }

    const id = order.id;
    this.submitting.set(true);
    this.#orders
      .createReview(id, {
        rating: this.rating(),
        comment: this.comment().trim() || undefined,
        tagIds: this.selectedTagIds(),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          if (this.order()?.id !== id) return;
          this.sent.set({
            rating: Number(response?.rating ?? this.rating()),
            comment: response?.comment?.trim() || this.comment().trim() || null,
          });
          this.#focusAfterRender(() => this.doneHeading()?.nativeElement);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (this.order()?.id !== id) return;
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.conflict.set(true);
            this.#focusAfterRender(() => this.doneHeading()?.nativeElement);
            return;
          }
          this.submitError.set(apiMessage(error) ?? 'Verifique sua conexão e tente de novo.');
        },
      });
  }

  #reset(): void {
    this.order.set(null);
    this.rating.set(0);
    this.hover.set(0);
    this.comment.set('');
    this.selectedTagIds.set([]);
    this.submitted.set(false);
    this.submitting.set(false);
    this.submitError.set('');
    this.conflict.set(false);
    this.sent.set(null);
  }

  #focusAfterRender(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.#injector });
  }
}

/** A mensagem da API quando é um texto (a validação do Nest manda uma lista: fica a mensagem da tela). */
function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message: unknown = body.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}
