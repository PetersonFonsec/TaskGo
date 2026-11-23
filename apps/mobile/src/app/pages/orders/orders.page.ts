import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular';

import { OrderListItem } from '@app/core/orders/orders.models';
import { orderStatusLabel, orderStatusTone, OrdersService } from '@app/core/orders/orders.service';
import { privateResource } from '@app/core/orders/private-resource';
import { TgIconComponent } from '@app/shared/ui/tg-icon.component';

@Component({
  selector: 'app-orders',
  imports: [
    RouterLink,
    IonBadge,
    IonButton,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    TgIconComponent
  ],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss'
})
export class OrdersPage {
  readonly #orders = inject(OrdersService);
  readonly #list = privateResource(signal(null), () => this.#orders.list());

  /** Pedidos da sessão atual; some na hora em logout ou troca de conta. */
  readonly state = this.#list.state;

  readonly statusLabel = orderStatusLabel;
  readonly statusTone = orderStatusTone;

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
