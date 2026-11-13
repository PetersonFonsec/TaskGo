import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular';
import { catchError, identity, map, of, startWith, switchMap, tap } from 'rxjs';

import { OrderListItem } from '@app/core/orders/orders.models';
import { orderStatusColor, orderStatusLabel, OrdersService } from '@app/core/orders/orders.service';

type OrdersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; orders: readonly OrderListItem[] };

@Component({
  selector: 'app-orders',
  imports: [
    RouterLink,
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './orders.page.html'
})
export class OrdersPage {
  readonly #orders = inject(OrdersService);
  readonly #reload = signal(0);
  #refresher: RefresherCustomEvent | null = null;

  readonly state = toSignal(
    toObservable(this.#reload).pipe(
      switchMap((attempt) =>
        this.#orders.list().pipe(
          map((orders): OrdersState => ({ status: 'ready', orders })),
          catchError(() => of<OrdersState>({ status: 'error' })),
          tap(() => this.#finishRefresh()),
          // Ao puxar para atualizar, a lista atual continua na tela.
          attempt === 0 ? startWith<OrdersState>({ status: 'loading' }) : identity
        )
      )
    ),
    { initialValue: { status: 'loading' } as OrdersState }
  );

  readonly statusLabel = orderStatusLabel;
  readonly statusColor = orderStatusColor;

  refresh(event: RefresherCustomEvent): void {
    this.#refresher = event;
    this.#reload.update((n) => n + 1);
  }

  /** Atualiza ao voltar para a tela (o Ionic mantém a página viva na pilha). */
  ionViewWillEnter(): void {
    if (this.state().status !== 'loading') this.#reload.update((n) => n + 1);
  }

  providerName(order: OrderListItem): string {
    return order.service.provider?.user?.name ?? 'Profissional';
  }

  when(order: OrderListItem): string {
    return order.scheduledFor ? formatDateTime(order.scheduledFor) : 'Data a combinar';
  }

  #finishRefresh(): void {
    void this.#refresher?.target.complete();
    this.#refresher = null;
  }
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
    .format(new Date(value))
    .replace(/\./g, '');
}
