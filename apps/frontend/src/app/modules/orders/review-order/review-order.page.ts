import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { RatingComponent } from '@shared/components/rating/rating.component';
import { ReviewTagChipComponent } from '@shared/components/review-tag-chip/review-tag-chip.component';
import { OrderDetails, RatingOption, ReviewTag } from '@shared/service/order/order.model';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-review-order-page',
  imports: [FormsModule, RatingComponent, ReviewTagChipComponent],
  templateUrl: './review-order.page.html',
  styleUrl: './review-order.page.scss',
})
export class ReviewOrderPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);

  order = signal<OrderDetails | null>(null);
  rating = signal(0);
  comment = signal('');
  tags = signal<ReviewTag[]>([]);
  selectedTagIds = signal<string[]>([]);
  tagsLoading = signal(true);
  loading = signal(true);
  submitting = signal(false);
  success = signal(false);
  error = signal('');

  ratingOptions: RatingOption[] = [
    { value: 1, label: 'Muito insatisfeito' }, { value: 2, label: 'Insatisfeito' },
    { value: 3, label: 'Regular' }, { value: 4, label: 'Bom atendimento' },
    { value: 5, label: 'Excelente atendimento' },
  ];
  ratingMessage = computed(() => this.ratingOptions.find((option) => option.value === this.rating())?.label ?? 'Selecione uma nota');

  ngOnInit(): void {
    this.#orders.getReviewTags().pipe(
      finalize(() => this.tagsLoading.set(false)),
    ).subscribe({
      next: (tags) => this.tags.set(tags),
      error: () => this.tags.set([]),
    });

    this.#route.paramMap.pipe(
      switchMap((params) => this.#orders.getOrderDetails(params.get('id') ?? '').pipe(finalize(() => this.loading.set(false)))),
    ).subscribe({
      next: (order) => {
        const isOwner = String(this.#session.user()?.user?.id) === String(order.client.id);
        if (!isOwner || order.status !== 'CONCLUIDO' || order.review) {
          void this.#router.navigate(['/orders', order.id]);
          return;
        }
        this.order.set(order);
      },
      error: () => this.error.set('Não foi possível carregar os dados do atendimento.'),
    });
  }

  toggleTag(tagId: string): void {
    this.selectedTagIds.update((ids) => ids.includes(tagId)
      ? ids.filter((id) => id !== tagId)
      : [...ids, tagId]);
  }

  submit(): void {
    if (!this.order() || !this.rating() || this.submitting() || this.success()) return;
    this.submitting.set(true);
    this.error.set('');
    this.#orders.createReview(this.order()!.id, {
      rating: this.rating(),
      comment: this.comment().trim() || undefined,
      tagIds: this.selectedTagIds(),
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.success.set(true);
        window.setTimeout(() => void this.#router.navigate(['/orders', this.order()!.id]), 1200);
      },
      error: (error: HttpErrorResponse) => this.error.set(error.status === 409 ? 'Este atendimento já foi avaliado.' : error.error?.message || 'Não foi possível enviar sua avaliação.'),
    });
  }

  setComment(value: string): void { this.comment.set(value.slice(0, 500)); }
  back(): void { void this.#router.navigate(['/orders', this.#route.snapshot.paramMap.get('id')]); }
  formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) : 'Data não informada'; }
  formatMoney(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
