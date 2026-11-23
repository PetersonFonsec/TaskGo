import { Component, computed, inject, input } from '@angular/core';
import {
  IonAvatar,
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular';
import { OrderDetails, OrderStatus } from '@app/core/orders/orders.models';
import { orderStatusLabel, OrdersService } from '@app/core/orders/orders.service';
import { privateResource } from '@app/core/orders/private-resource';
import { registerTgIcons } from '@app/core/ui/tg-icons';
import { formatDateTime } from '../orders/orders.page';

/** O que o cliente precisa saber em cada etapa. */
const NEXT_STEP: Partial<Record<string, string>> = {
  AGUARDANDO_APROVACAO: 'O profissional ainda vai confirmar o pedido. Você recebe um aviso quando ele responder.',
  AGUARDANDO_PAGAMENTO: 'Pedido aceito! Por enquanto, faça o pagamento por PIX no site do TaskGo.',
  AGENDADO: 'Pagamento confirmado. O profissional avisa quando sair para o atendimento.',
  EM_DESLOCAMENTO: 'O profissional está a caminho do endereço.',
  EM_ANDAMENTO: 'O serviço está sendo realizado.',
  AGUARDANDO_CONFIRMACAO_CLIENTE: 'O profissional finalizou. Confirme a conclusão no site do TaskGo.',
  DISPUTA: 'Recebemos o problema relatado e estamos analisando.'
};

/** Tom do selo de status, no mesmo mapa do site (tg-order-status do frontend). */
export type OrderStatusTone = 'waiting' | 'confirmed' | 'progress' | 'done' | 'cancelled';

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

/** Classes do ion-badge de status; status desconhecido fica no selo neutro. */
export function orderStatusBadgeClass(status: string): string {
  return isOrderStatus(status) ? `tg-badge tg-badge--${STATUS_TONES[status]}` : 'tg-badge';
}

function isOrderStatus(status: string): status is OrderStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_TONES, status);
}

@Component({
  selector: 'app-order',
  imports: [
    IonAvatar,
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './order.page.html',
  styles: `
    .summary {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--tg-space-3);
      padding: var(--tg-space-4);
    }
    .summary > p {
      margin: 0;
    }
    .summary > .tg-alert {
      align-self: stretch;
    }
    .person__placeholder {
      font-size: 40px;
      color: var(--tg-text-secondary);
    }
    .person__name {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--tg-space-2);
    }
    .timeline__icon {
      color: var(--tg-feedback-success-text);
    }
  `
})
export class OrderPage {
  readonly #orders = inject(OrdersService);

  /** Vem da rota: /pedidos/:id */
  readonly id = input.required<string>();

  readonly #details = privateResource(this.id, (id) => this.#orders.details(id));
  /** Pedido da sessão atual; some na hora em logout ou troca de conta. */
  readonly state = this.#details.state;
  readonly order = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.value : null;
  });
  readonly nextStep = computed(() => NEXT_STEP[this.order()?.status ?? ''] ?? null);

  readonly statusLabel = orderStatusLabel;
  readonly statusBadgeClass = orderStatusBadgeClass;
  readonly formatDateTime = formatDateTime;

  constructor() {
    registerTgIcons();
  }

  refresh(event: RefresherCustomEvent): void {
    this.#details.refresh(event);
  }

  ionViewWillEnter(): void {
    const status = this.state().status;
    if (status === 'ready' || status === 'error') this.#details.reload();
  }

  ionViewWillLeave(): void {
    this.#details.cancelRefreshes();
  }

  amount(order: OrderDetails): string {
    const value = order.payment?.finalAmount ?? order.payment?.estimatedAmount ?? order.service.estimatedPrice;
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  address(order: OrderDetails): string | null {
    const a = order.address;
    if (!a) return null;
    const street = [a.street, a.number].filter(Boolean).join(', ');
    return [street, a.complement, a.neighborhood, [a.city, a.state].filter(Boolean).join('/')]
      .filter(Boolean)
      .join(' · ');
  }
}
