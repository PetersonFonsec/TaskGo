import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@environments/environment';
import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faCheck,
  faClock,
  faLocationDot,
  faStar,
} from '@fortawesome/free-solid-svg-icons';

import { ProviderRevenueChartComponent } from '@shared/components/functional/provider-revenue-chart/provider-revenue-chart';
import { providerInsights, providerSummary, RequestStatus, ProviderHomeData } from './data';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Order } from '@shared/service/order/order';
import { finalize } from 'rxjs';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-provider-home',
  imports: [
    CurrencyPipe,
    FontAwesomeModule,
    ProviderRevenueChartComponent,
    RouterLink,
    ButtonComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class ProviderHomePage implements OnInit {
  private readonly session = inject(UserLoggedService).user();
  private readonly orders = inject(Order);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private home: ProviderHomeData | null = null;
  readonly loading = signal(false);
  readonly dashboardError = signal('');
  readonly loaded = signal(false);

  readonly providerName = this.session.user?.name?.split(' ')[0] ?? 'Prestador';
  get summary() {
    return this.home ? this.buildSummary() : [];
  }
  get revenue() {
    return this.home?.earnings.lastSixMonths ?? [];
  }
  get services() {
    return (
      this.home?.recentServices.map((service) => ({
        ...service,
        date: this.formatDate(service.completedAt),
        rating: service.rating ?? 0,
      })) ?? []
    );
  }
  get insights() {
    return this.home ? this.buildInsights() : [];
  }
  readonly requests = signal<
    Array<
      Omit<ProviderHomeData['pendingRequests'][number], 'status'> & {
        date: string;
        time: string;
        status: RequestStatus;
      }
    >
  >([]);
  readonly activeOrders = signal<
    Array<NonNullable<ProviderHomeData['activeOrders']>[number] & { date: string; time: string }>
  >([]);
  readonly pendingCount = computed(
    () => this.requests().filter(({ status }) => status === 'pending').length,
  );
  readonly updatingRequestIds = signal<Set<string | number>>(new Set());
  readonly updatingActiveOrderIds = signal<Set<string | number>>(new Set());
  readonly requestError = signal('');
  readonly activeOrderError = signal('');

  readonly icons = {
    calendar: faCalendarDays,
    check: faCheck,
    clock: faClock,
    location: faLocationDot,
    star: faStar,
  };

  ngOnInit(): void {
    this.refresh();
  }

  updateRequestStatus(id: string | number, status: Exclude<RequestStatus, 'pending'>): void {
    if (this.updatingRequestIds().has(id)) return;

    const providerId = this.session.user?.id;
    if (!providerId) {
      this.requestError.set('Não foi possível identificar o prestador logado.');
      return;
    }

    this.requestError.set('');
    this.updatingRequestIds.update((ids) => new Set(ids).add(id));
    const request =
      status === 'accepted'
        ? this.orders.confirmOrder(String(id), String(providerId))
        : this.orders.cancelOrder(String(id), String(providerId));

    request
      .pipe(
        finalize(() =>
          this.updatingRequestIds.update((ids) => {
            const next = new Set(ids);
            next.delete(id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.requests.update((requests) =>
            requests.map((item) => (item.id === id ? { ...item, status } : item)),
          );
          this.refresh();
        },
        error: (error: HttpErrorResponse) =>
          this.requestError.set(
            error.error?.message ?? 'Não foi possível responder à solicitação. Tente novamente.',
          ),
      });
  }

  ratingLabel(rating: number): string {
    return `${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGENDADO: 'Agendado',
      EM_DESLOCAMENTO: 'Em deslocamento',
      EM_ANDAMENTO: 'Em andamento',
      AGUARDANDO_CONFIRMACAO_CLIENTE: 'Aguardando confirmação do cliente',
    };
    return labels[status] ?? status.toLowerCase().replaceAll('_', ' ');
  }

  updateActiveOrderStatus(id: string | number, status: 'EM_DESLOCAMENTO' | 'EM_ANDAMENTO'): void {
    if (this.updatingActiveOrderIds().has(id)) return;

    this.activeOrderError.set('');
    this.updatingActiveOrderIds.update((ids) => new Set(ids).add(id));
    this.orders
      .updateOrderStatus(String(id), status)
      .pipe(
        finalize(() =>
          this.updatingActiveOrderIds.update((ids) => {
            const next = new Set(ids);
            next.delete(id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: () => this.refresh(),
        error: (error: HttpErrorResponse) =>
          this.activeOrderError.set(
            error.error?.message ?? 'Não foi possível atualizar o serviço. Tente novamente.',
          ),
      });
  }

  refresh(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.dashboardError.set('');
    this.http
      .get<ProviderHomeData>(environment.url + '/auth/provider-home')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (home) => {
          this.home = home;
          this.loaded.set(true);
          this.requests.set(
            home.pendingRequests.map((request) => ({
              ...request,
              ...this.formatSchedule(request.scheduledFor),
            })),
          );
          this.activeOrders.set(
            (home.activeOrders ?? []).map((order) => ({
              ...order,
              ...this.formatSchedule(order.scheduledFor),
            })),
          );
        },
        error: () =>
          this.dashboardError.set('Não foi possível atualizar o painel. Tente novamente.'),
      });
  }

  private buildSummary() {
    const home = this.home!;
    const growth =
      home.earnings.previousMonth > 0
        ? ((home.earnings.month - home.earnings.previousMonth) / home.earnings.previousMonth) * 100
        : null;
    const currency = (value: number) =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(value);

    return providerSummary.map((item) => {
      if (item.id === 'today')
        return {
          ...item,
          value: currency(home.earnings.today),
          description: 'Parcela dos serviços pagos hoje',
        };
      if (item.id === 'month')
        return {
          ...item,
          value: currency(home.earnings.month),
          description:
            growth === null
              ? 'Sem histórico do mês anterior'
              : `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}% em relação ao mês passado`,
          trend: growth !== null && growth > 0 ? ('positive' as const) : ('neutral' as const),
        };
      if (item.id === 'services')
        return {
          ...item,
          value: String(home.services.completedTotal),
          description: `${home.services.completedThisWeek} concluídos nesta semana`,
        };
      return {
        ...item,
        value: home.rating.average.toFixed(1),
        description: `Com base em ${home.rating.count} avaliações`,
      };
    });
  }

  private buildInsights() {
    const insights = this.home!.insights;
    const currency = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
    return providerInsights
      .filter(({ id }) => id !== 'time')
      .map((item) => {
        if (item.id === 'popular')
          return { ...item, value: insights.mostRequestedService ?? 'Sem dados' };
        if (item.id === 'ticket')
          return { ...item, value: currency.format(insights.averageTicket) };
        if (item.id === 'region')
          return { ...item, value: insights.mostServedNeighborhood ?? 'Sem dados' };
        return {
          ...item,
          value:
            insights.monthlyGrowth === null
              ? 'Sem histórico'
              : `${insights.monthlyGrowth >= 0 ? '+' : ''}${insights.monthlyGrowth.toFixed(0)}%`,
        };
      });
  }

  private formatSchedule(value: string | null): { date: string; time: string } {
    if (!value) return { date: 'A combinar', time: '' };
    const date = new Date(value);
    return {
      date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date),
      time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date),
    };
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
      new Date(value),
    );
  }
}
