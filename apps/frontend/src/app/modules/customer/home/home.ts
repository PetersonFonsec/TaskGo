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
import { catchError, map, of, Subject, switchMap } from 'rxjs';

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
  readonly searchLink = '/customer/search';

  /**
   * Id de quem está logado. A sessão vem do localStorage e pode estar vazia
   * ou incompleta (`{}`, `null` depois do logout): sem id, nada que depende
   * do usuário é consultado e nenhum link leva `undefined`.
   */
  readonly #userId = computed(() => {
    const id: unknown = this.#userLogged.user()?.user?.id;
    return (typeof id === 'string' && id.trim()) || (typeof id === 'number' && Number.isFinite(id))
      ? String(id)
      : null;
  });
  readonly addressLink = computed(() => {
    const id = this.#userId();
    return id ? ['/general', id, 'addresses'] : null;
  });

  /** Primeiro nome de quem está logado; sem nome, só "Olá". */
  readonly firstName = computed(() => this.#userLogged.user()?.user?.name?.trim().split(/\s+/)[0] ?? '');

  readonly categories = signal<ICategory[]>([]);
  readonly orders = signal<OrdersResponse>([]);
  readonly ordersLoading = signal(true);
  readonly ordersError = signal(false);
  readonly agenda = computed(() => customerHomeAgenda(this.orders()));

  /**
   * Cada carga de pedidos passa por aqui. O switchMap cancela a anterior:
   * só a mais recente muda pedidos, carregamento e erro, e uma resposta (ou
   * erro) antiga nunca sobrescreve a atual. Ao destruir a tela, a carga em
   * curso é cancelada.
   */
  readonly #ordersRequests = new Subject<string>();

  constructor() {
    this.#ordersRequests
      .pipe(
        switchMap((userId) => {
          this.ordersLoading.set(true);
          this.ordersError.set(false);
          return this.#order.getOrderByClient(userId).pipe(
            map((orders): OrdersResult => ({ ok: true, orders })),
            catchError(() => of<OrdersResult>({ ok: false })),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        this.orders.set(result.ok ? result.orders : []);
        this.ordersError.set(!result.ok);
        this.ordersLoading.set(false);
      });
  }

  ngOnInit(): void {
    const userId = this.#userId();

    if (userId) {
      this.#address
        .getAddress(userId, 1)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: ({ data }) => this.addressMissing.set(data.length === 0),
          error: () => this.addressMissing.set(false),
        });
    }

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

  /** Carrega (ou recarrega, no "Tentar de novo") os pedidos de quem está logado. */
  loadOrders(): void {
    const userId = this.#userId();
    if (userId) {
      this.#ordersRequests.next(userId);
      return;
    }
    // Sessão sem id: não consulta; a agenda mostra o erro com "Tentar de novo",
    // que lê a sessão outra vez.
    this.orders.set([]);
    this.ordersError.set(true);
    this.ordersLoading.set(false);
  }
}

type OrdersResult = { ok: true; orders: OrdersResponse } | { ok: false };
