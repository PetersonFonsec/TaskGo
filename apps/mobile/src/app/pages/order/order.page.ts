import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
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
  IonText,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, personCircle, shieldCheckmark } from 'ionicons/icons';
import { catchError, combineLatest, identity, map, of, startWith, switchMap, tap } from 'rxjs';

import { OrderDetails } from '@app/core/orders/orders.models';
import { orderStatusColor, orderStatusLabel, OrdersService } from '@app/core/orders/orders.service';
import { formatDateTime } from '../orders/orders.page';

type OrderState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; order: OrderDetails };

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
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './order.page.html'
})
export class OrderPage {
  readonly #orders = inject(OrdersService);
  readonly #reload = signal(0);
  #refresher: RefresherCustomEvent | null = null;

  /** Vem da rota: /pedidos/:id */
  readonly id = input.required<string>();

  readonly state = toSignal(
    combineLatest([toObservable(this.id), toObservable(this.#reload)]).pipe(
      switchMap(([id, attempt]) =>
        this.#orders.details(id).pipe(
          map((order): OrderState => ({ status: 'ready', order })),
          catchError(() => of<OrderState>({ status: 'error' })),
          tap(() => this.#finishRefresh()),
          attempt === 0 ? startWith<OrderState>({ status: 'loading' }) : identity
        )
      )
    ),
    { initialValue: { status: 'loading' } as OrderState }
  );
  readonly order = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.order : null;
  });
  readonly nextStep = computed(() => NEXT_STEP[this.order()?.status ?? ''] ?? null);

  readonly statusLabel = orderStatusLabel;
  readonly statusColor = orderStatusColor;
  readonly formatDateTime = formatDateTime;

  constructor() {
    addIcons({ checkmarkCircle, personCircle, shieldCheckmark });
  }

  refresh(event: RefresherCustomEvent): void {
    this.#refresher = event;
    this.#reload.update((n) => n + 1);
  }

  ionViewWillEnter(): void {
    if (this.state().status !== 'loading') this.#reload.update((n) => n + 1);
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

  #finishRefresh(): void {
    void this.#refresher?.target.complete();
    this.#refresher = null;
  }
}
