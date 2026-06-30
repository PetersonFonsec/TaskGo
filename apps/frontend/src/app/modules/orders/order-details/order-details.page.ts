import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { OrderDetails } from '@shared/service/order/order.model';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Roles } from '@shared/enums/roles.enum';
import { OrderTimelineComponent } from '../order-timeline/order-timeline';

type OrderAction = { label: string; status?: string; secondary?: boolean };

@Component({
  selector: 'app-order-details-page',
  imports: [OrderTimelineComponent],
  templateUrl: './order-details.page.html',
  styleUrl: './order-details.page.scss',
})
export class OrderDetailsPage implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #orders = inject(Order);
  readonly #session = inject(UserLoggedService);

  order = signal<OrderDetails | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  error = signal('');
  role = computed(() => this.#session.user()?.user?.type === Roles.PROVIDER ? 'PRESTADOR' : 'CLIENTE');
  statusLabel = computed(() => this.humanize(this.order()?.status ?? ''));
  actions = computed<OrderAction[]>(() => {
    const status = this.order()?.status;
    if (this.role() === 'PRESTADOR') {
      if (status === 'AGENDADO') return [{ label: 'Estou a caminho', status: 'EM_DESLOCAMENTO' }];
      if (status === 'EM_DESLOCAMENTO') return [{ label: 'Iniciar serviço', status: 'EM_ANDAMENTO' }];
      if (status === 'EM_ANDAMENTO') return [{ label: 'Finalizar serviço', status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' }];
    }
    if (this.role() === 'CLIENTE' && status === 'AGUARDANDO_CONFIRMACAO_CLIENTE') {
      return [
        { label: 'Confirmar conclusão', status: 'CONCLUIDO' },
        { label: 'Reportar problema', status: 'DISPUTA', secondary: true },
      ];
    }
    if (this.role() === 'CLIENTE' && status === 'CONCLUIDO' && !this.order()?.review) {
      return [{ label: 'Avaliar prestador' }];
    }
    return [];
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.#route.paramMap.pipe(
      switchMap((params) => {
        this.loading.set(true);
        this.error.set('');
        return this.#orders.getOrderDetails(params.get('id') ?? '').pipe(finalize(() => this.loading.set(false)));
      }),
    ).subscribe({
      next: (order) => this.order.set(order),
      error: (error: HttpErrorResponse) => {
        this.error.set(error.status === 404 ? 'Este pedido não foi encontrado.' : 'Não foi possível carregar o pedido. Tente novamente.');
      },
    });
  }

  goBack(): void { void this.#router.navigateByUrl(this.role() === 'PRESTADOR' ? '/provider' : '/customer'); }

  runAction(action: OrderAction): void {
    if (!action.status || !this.order()) return;
    if (action.label === 'Finalizar serviço') {
      void this.#router.navigate(['/orders', this.order()!.id, 'finish']);
      return;
    }
    this.actionLoading.set(true);
    this.#orders.updateOrderStatus(this.order()!.id, action.status)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => this.load(),
        error: () => this.error.set('Não foi possível atualizar o pedido.'),
      });
  }

  formatDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value)) : 'A definir';
  }
  formatTime(value: string | null): string {
    return value ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'A definir';
  }
  formatMoney(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  humanize(value: string): string { return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()); }
  paymentMethod(value: string): string { return value === 'CARTAO' ? 'Cartão' : this.humanize(value); }
  addressLine(order: OrderDetails): string {
    const address = order.address;
    if (!address) return 'Endereço não informado';
    return [address.street, address.number, address.complement, address.neighborhood].filter(Boolean).join(', ');
  }
}
