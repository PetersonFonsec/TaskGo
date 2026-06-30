import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { OrderDetails } from '@shared/service/order/order.model';
import { Order } from '@shared/service/order/order';

interface PhotoPreview { name: string; url: string; type: 'AFTER' }

@Component({
  selector: 'app-finish-service-page',
  imports: [ReactiveFormsModule],
  templateUrl: './finish-service.page.html',
  styleUrl: './finish-service.page.scss',
})
export class FinishServicePage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);
  readonly #fb = inject(FormBuilder);

  order = signal<OrderDetails | null>(null);
  photos = signal<PhotoPreview[]>([]);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  error = signal('');
  toast = signal('');

  form = this.#fb.nonNullable.group({
    finalPrice: [0, [Validators.required, Validators.min(0.01)]],
    providerNotes: ['', Validators.maxLength(1000)],
    priceAdjustmentReason: ['', Validators.maxLength(500)],
  });

  finalPriceValue = toSignal(this.form.controls.finalPrice.valueChanges, {
    initialValue: this.form.controls.finalPrice.value,
  });
  estimatedPrice = computed(() => this.order()?.payment?.estimatedAmount ?? this.order()?.service.estimatedPrice ?? 0);
  priceDifference = computed(() => Number(this.finalPriceValue() || 0) - this.estimatedPrice());
  priceChanged = computed(() => Math.abs(this.priceDifference()) > 0.009);

  ngOnInit(): void {
    this.#route.paramMap.pipe(
      switchMap((params) => this.#orders.getOrderDetails(params.get('id') ?? '').pipe(finalize(() => this.loading.set(false)))),
    ).subscribe({
      next: (order) => {
        if (order.status !== 'EM_ANDAMENTO') {
          this.error.set('Este pedido não está em andamento e não pode ser finalizado.');
          this.order.set(order);
          return;
        }
        this.order.set(order);
        this.form.controls.finalPrice.setValue(order.payment?.estimatedAmount ?? order.service.estimatedPrice);
      },
      error: (error: HttpErrorResponse) => this.error.set(error.status === 404 ? 'Pedido não encontrado.' : 'Não foi possível carregar o atendimento.'),
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const available = 5 - this.photos().length;
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/')).slice(0, available);
    if ((input.files?.length ?? 0) > available) this.error.set('Você pode adicionar no máximo 5 imagens.');
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => this.photos.update((items) => [...items, { name: file.name, url: String(reader.result), type: 'AFTER' }]);
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  removePhoto(index: number): void { this.photos.update((items) => items.filter((_, itemIndex) => itemIndex !== index)); }

  submit(): void {
    this.submitted.set(true);
    this.error.set('');
    const reason = this.form.controls.priceAdjustmentReason.value.trim();
    if (this.form.invalid || (this.priceChanged() && !reason) || !this.order()) return;

    this.submitting.set(true);
    this.#orders.finishOrder(this.order()!.id, {
      finalPrice: this.form.controls.finalPrice.value,
      providerNotes: this.form.controls.providerNotes.value.trim() || undefined,
      priceAdjustmentReason: this.priceChanged() ? reason : undefined,
      photos: this.photos().map(({ url, type }) => ({ url, type })),
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (response) => {
        this.toast.set(response.message || 'Conclusão enviada para o cliente');
        setTimeout(() => void this.#router.navigate(['/orders', response.id]), 900);
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.message || 'Não foi possível enviar a conclusão. Tente novamente.'),
    });
  }

  backToDetails(): void { void this.#router.navigate(['/orders', this.#route.snapshot.paramMap.get('id')]); }
  formatMoney(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  formatDate(value: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value)) : 'A definir'; }
  formatTime(value: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'A definir'; }
  address(): string { const a = this.order()?.address; return a ? [a.street, a.number, a.neighborhood].filter(Boolean).join(', ') : 'Endereço não informado'; }
}
