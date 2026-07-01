import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';

import { Order } from '@shared/service/order/order';
import { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';

@Component({
  selector: 'app-order-payment-page',
  imports: [FormsModule],
  templateUrl: './order-payment.page.html',
  styleUrl: './order-payment.page.scss',
})
export class OrderPaymentPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);

  order = signal<OrderDetails | null>(null);
  payment = signal<OrderPaymentResponse | null>(null);
  method = signal<'PIX' | 'CARTAO'>('PIX');
  loading = signal(true);
  submitting = signal(false);
  copied = signal(false);
  error = signal('');
  toast = signal('');
  card = { number: '', holderName: '', expMonth: 1, expYear: new Date().getFullYear() + 1, cvv: '' };

  ngOnInit(): void {
    this.#route.paramMap.pipe(switchMap((params) => {
      const id = params.get('id') ?? '';
      return forkJoin({
        order: this.#orders.getOrderDetails(id),
        payment: this.#orders.getOrderPayment(id).pipe(catchError(() => of(null))),
      }).pipe(finalize(() => this.loading.set(false)));
    })).subscribe({
      next: ({ order, payment }) => { this.order.set(order); this.payment.set(payment); if (payment) this.method.set(payment.method); },
      error: () => this.error.set('Não foi possível carregar os dados do pagamento.'),
    });
  }

  submit(): void {
    if (!this.order() || this.submitting()) return;
    if (this.method() === 'CARTAO' && (!this.card.number || !this.card.holderName || !this.card.cvv)) {
      this.error.set('Preencha todos os dados do cartão.'); return;
    }
    this.error.set(''); this.submitting.set(true);
    this.#orders.createOrderPayment(this.order()!.id, {
      method: this.method(),
      card: this.method() === 'CARTAO' ? { ...this.card } : undefined,
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (payment) => {
        this.payment.set(payment); this.toast.set('Pagamento registrado com sucesso');
        if (payment.method === 'CARTAO') window.setTimeout(() => void this.#router.navigate(['/orders', payment.orderId]), 1000);
      },
      error: (error: HttpErrorResponse) => this.error.set(error.error?.message || 'Não foi possível processar o pagamento.'),
    });
  }

  async copyPix(): Promise<void> {
    const code = this.payment()?.pix?.qrCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    this.copied.set(true); window.setTimeout(() => this.copied.set(false), 1500);
  }

  back(): void { void this.#router.navigate(['/orders', this.#route.snapshot.paramMap.get('id')]); }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  date(value?: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'; }
}
