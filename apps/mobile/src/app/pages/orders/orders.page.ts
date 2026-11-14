import { Component, inject, signal } from '@angular/core';
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

import { OrderListItem } from '@app/core/orders/orders.models';
import { orderStatusColor, orderStatusLabel, OrdersService } from '@app/core/orders/orders.service';
import { privateResource } from '@app/core/orders/private-resource';

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
  readonly #list = privateResource(signal(null), () => this.#orders.list());

  /** Pedidos da sessão atual; some na hora em logout ou troca de conta. */
  readonly state = this.#list.state;

  readonly statusLabel = orderStatusLabel;
  readonly statusColor = orderStatusColor;

  refresh(event: RefresherCustomEvent): void {
    this.#list.refresh(event);
  }

  /** Atualiza ao voltar para a tela (o Ionic mantém a página viva na pilha). */
  ionViewWillEnter(): void {
    const status = this.state().status;
    if (status === 'ready' || status === 'error') this.#list.reload();
  }

  ionViewWillLeave(): void {
    this.#list.cancelRefreshes();
  }

  providerName(order: OrderListItem): string {
    return order.service.provider?.user?.name ?? 'Profissional';
  }

  when(order: OrderListItem): string {
    return order.scheduledFor ? formatDateTime(order.scheduledFor) : 'Data a combinar';
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
