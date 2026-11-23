import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
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

import { OrderListItem, OrderStatus } from '@app/core/orders/orders.models';
import { orderStatusLabel, OrdersService } from '@app/core/orders/orders.service';
import { privateResource } from '@app/core/orders/private-resource';
import { registerTgIcons } from '@app/core/ui/tg-icons';

@Component({
  selector: 'app-orders',
  imports: [
    RouterLink,
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonTitle,
    IonToolbar
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
  readonly statusBadgeClass = orderStatusBadgeClass;

  constructor() {
    registerTgIcons();
  }

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

/** Tom do selo de status, no mesmo mapa do site (tg-order-status do frontend). */
type OrderStatusTone = 'waiting' | 'confirmed' | 'progress' | 'done' | 'cancelled';

const STATUS_TONES: Record<OrderStatus, OrderStatusTone> = {
  AGUARDANDO_APROVACAO: 'waiting',
  AGUARDANDO_PAGAMENTO: 'waiting',
  AGENDADO: 'confirmed',
  EM_DESLOCAMENTO: 'progress',
  EM_ANDAMENTO: 'progress',
  AGUARDANDO_CONFIRMACAO_CLIENTE: 'waiting',
  CONCLUIDO: 'done',
  DISPUTA: 'waiting',
  REJEITADO: 'cancelled',
  CANCELADO: 'cancelled'
};

/** Classes do ion-badge do status. Status desconhecido fica com o selo neutro. */
export function orderStatusBadgeClass(status: string): string {
  const tone = Object.prototype.hasOwnProperty.call(STATUS_TONES, status)
    ? STATUS_TONES[status as OrderStatus]
    : null;
  return tone ? `tg-badge tg-badge--${tone}` : 'tg-badge';
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
