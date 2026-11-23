import { Component, computed, inject, input } from '@angular/core';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular';

import { OrderDetails } from '@app/core/orders/orders.models';
import { orderStatusLabel, orderStatusTone, OrdersService } from '@app/core/orders/orders.service';
import { privateResource } from '@app/core/orders/private-resource';
import { TgIconComponent } from '@app/shared/ui/tg-icon.component';
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

@Component({
  selector: 'app-order',
  imports: [
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    TgIconComponent
  ],
  templateUrl: './order.page.html',
  styleUrl: './order.page.scss'
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
  readonly statusTone = orderStatusTone;
  readonly formatDateTime = formatDateTime;

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

  /** Iniciais do primeiro e do último nome, para o avatar sem foto. */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
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
