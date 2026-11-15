import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';

import { Address } from '@shared/service/address/address';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { CategoryService } from '@shared/service/category/category';
import { ICategory } from '@shared/service/category/category.model';
import { Order } from '@shared/service/order/order';
import { OrdersResponse } from '@shared/service/order/order.model';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgAppointmentCardComponent } from '@shared/design-system/appointment-card/tg-appointment-card.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import {
  TgOrderListComponent,
  TgOrderRowComponent,
} from '@shared/design-system/order-row/tg-order-row.component';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { customerHomeAgenda } from './customer-home.agenda';

/**
 * Início do cliente (Etapa 9, tela piloto do Design System): saudação com a
 * busca, a agenda (um pedido em destaque e os demais ativos em lista), as
 * categorias (card do DS com imagem e nome) e o histórico com pedidos
 * reais. Só tokens e componentes do DS.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgAppointmentCardComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgOrderListComponent,
    TgOrderRowComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  #categoryService = inject(CategoryService);
  #userLogged = inject(UserLoggedService);
  #order = inject(Order);
  #address = inject(Address);
  #destroyRef = inject(DestroyRef);

  readonly addressMissing = signal(false);
  readonly addressLink = ['/general', this.#userLogged.user().user.id, 'addresses'];
  readonly searchLink = '/customer/search';

  /** Primeiro nome de quem está logado; sem nome, só "Olá". */
  readonly firstName = computed(() => this.#userLogged.user()?.user?.name?.trim().split(/\s+/)[0] ?? '');

  readonly categories = signal<ICategory[]>([]);
  readonly orders = signal<OrdersResponse>([]);
  readonly ordersLoading = signal(true);
  readonly ordersError = signal(false);
  readonly agenda = computed(() => customerHomeAgenda(this.orders()));

  ngOnInit(): void {
    const user = this.#userLogged.user().user;

    this.#address
      .getAddress(user.id, 1)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ data }) => this.addressMissing.set(data.length === 0),
        error: () => this.addressMissing.set(false),
      });

    // Categorias e pedidos carregam em separado: a falha de um não esconde o outro.
    this.#categoryService
      .getCategories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ data }) => this.categories.set(data),
        error: () => this.categories.set([]),
      });

    this.loadOrders();
  }

  loadOrders(): void {
    const user = this.#userLogged.user().user;
    this.ordersLoading.set(true);
    this.ordersError.set(false);

    this.#order
      .getOrderByClient(user.id)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.ordersLoading.set(false)),
      )
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: () => {
          this.orders.set([]);
          this.ordersError.set(true);
        },
      });
  }
}
