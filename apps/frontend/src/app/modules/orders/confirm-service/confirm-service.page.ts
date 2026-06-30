import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { OrderDetails } from '@shared/service/order/order.model';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-confirm-service-page',
  templateUrl: './confirm-service.page.html',
  styleUrl: './confirm-service.page.scss',
})
export class ConfirmServicePage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);

  order = signal<OrderDetails | null>(null);
  loading = signal(true);
  confirming = signal(false);
  modalOpen = signal(false);
  error = signal('');
  toast = signal('');
  estimatedPrice = computed(() => this.order()?.payment?.estimatedAmount ?? this.order()?.service.estimatedPrice ?? 0);
  finalPrice = computed(() => this.order()?.payment?.finalAmount ?? this.estimatedPrice());
  difference = computed(() => this.finalPrice() - this.estimatedPrice());
  priceChanged = computed(() => Math.abs(this.difference()) > 0.009);

  ngOnInit(): void {
    this.#route.paramMap.pipe(
      switchMap((params) => this.#orders.getOrderDetails(params.get('id') ?? '').pipe(finalize(() => this.loading.set(false)))),
    ).subscribe({
      next: (order) => {
        this.order.set(order);
        if (String(this.#session.user()?.user?.id) !== String(order.client.id)) {
          this.error.set('Apenas o cliente deste pedido pode confirmar a conclusão.');
          return;
        }
        if (order.status !== 'AGUARDANDO_CONFIRMACAO_CLIENTE') this.error.set('Este pedido não está aguardando sua confirmação.');
      },
      error: (error: HttpErrorResponse) => this.error.set(error.status === 404 ? 'Pedido não encontrado.' : 'Não foi possível carregar o serviço.'),
    });
  }

  confirm(): void {
    if (!this.order() || this.confirming()) return;
    this.confirming.set(true);
    this.error.set('');
    this.#orders.confirmOrderCompletion(this.order()!.id)
      .pipe(finalize(() => this.confirming.set(false)))
      .subscribe({
        next: (response) => {
          this.modalOpen.set(false);
          this.toast.set(response.message || 'Serviço confirmado com sucesso');
          setTimeout(() => void this.#router.navigate(['/orders', response.id, 'review']), 900);
        },
        error: (error: HttpErrorResponse) => {
          this.modalOpen.set(false);
          this.error.set(error.error?.message || 'Não foi possível confirmar o serviço. Tente novamente.');
        },
      });
  }

  back(): void { void this.#router.navigate(['/orders', this.#route.snapshot.paramMap.get('id')]); }
  reportProblem(): void { void this.#router.navigate(['/orders', this.#route.snapshot.paramMap.get('id'), 'report-problem']); }
  formatMoney(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  formatDate(value: string | null, withTime = false): string {
    if (!value) return 'Não informado';
    return new Intl.DateTimeFormat('pt-BR', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value));
  }
  formatTime(value: string | null): string { return value ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'A definir'; }
  humanize(value: string): string { return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()); }
  address(): string { const a = this.order()?.address; return a ? [a.street, a.number, a.neighborhood, a.city, a.state].filter(Boolean).join(', ') : 'Endereço não informado'; }
}
