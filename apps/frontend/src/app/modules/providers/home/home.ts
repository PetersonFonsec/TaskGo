import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import {
  completedServices,
  pendingRequests,
  providerInsights,
  providerRevenue,
  providerSummary,
  RequestStatus,
} from './data';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Order } from '@shared/service/order/order';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-provider-home',
  imports: [CurrencyPipe, FontAwesomeModule, ProviderRevenueChartComponent, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class ProviderHomePage implements OnInit {
  private readonly session = inject(UserLoggedService).user();
  private readonly orders = inject(Order);
  private readonly home = this.session.providerHome;

  readonly providerName = this.session.user?.name?.split(' ')[0] ?? 'Prestador';
  readonly summary = this.home ? this.buildSummary() : providerSummary;
  readonly revenue = this.home?.earnings.lastSixMonths ?? providerRevenue;
  readonly services = this.home?.recentServices.map((service) => ({
    ...service,
    date: this.formatDate(service.completedAt),
    rating: service.rating ?? 0,
  })) ?? completedServices;
  readonly insights = this.home ? this.buildInsights() : providerInsights;
  readonly requests = signal(this.home?.pendingRequests.map((request) => ({
    ...request,
    ...this.formatSchedule(request.scheduledFor),
  })) ?? pendingRequests.map((request) => ({ ...request })));
  readonly activeOrders = signal(this.home?.activeOrders?.map((order) => ({
    ...order,
    ...this.formatSchedule(order.scheduledFor),
  })) ?? []);
  readonly pendingCount = computed(
    () => this.requests().filter(({ status }) => status === 'pending').length,
  );
  readonly updatingRequestIds = signal<Set<string | number>>(new Set());
  readonly requestError = signal('');

  readonly icons = {
    calendar: faCalendarDays,
    check: faCheck,
    clock: faClock,
    location: faLocationDot,
    star: faStar,
  };

  ngOnInit(): void {
    this.loadActiveOrders();
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
    const request = status === 'accepted'
      ? this.orders.confirmOrder(String(id), String(providerId))
      : this.orders.cancelOrder(String(id), String(providerId));

    request.pipe(
      finalize(() => this.updatingRequestIds.update((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      })),
    ).subscribe({
      next: () => {
        this.requests.update((requests) =>
          requests.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        this.loadActiveOrders();
      },
      error: (error: HttpErrorResponse) => this.requestError.set(
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

  private loadActiveOrders(): void {
    const providerId = this.session.user?.id;
    if (!providerId) return;

    const activeStatuses = new Set([
      'AGUARDANDO_PAGAMENTO',
      'AGENDADO',
      'EM_DESLOCAMENTO',
      'EM_ANDAMENTO',
      'AGUARDANDO_CONFIRMACAO_CLIENTE',
    ]);
    this.orders.getOrderByProvider(String(providerId)).subscribe({
      next: (orders) => this.activeOrders.set(orders
        .filter((order) => activeStatuses.has(order.status))
        .map((order) => ({
          id: order.id,
          clientName: order.client?.name ?? 'Cliente',
          service: order.service?.title ?? 'Serviço',
          scheduledFor: order.scheduledFor ? String(order.scheduledFor) : null,
          amount: Number((order.finalPrice ?? order.payment?.amount ?? 0) as unknown as number),
          status: order.status,
          ...this.formatSchedule(order.scheduledFor ? String(order.scheduledFor) : null),
        }))),
      error: () => undefined,
    });
  }

  private buildSummary() {
    const home = this.home!;
    const growth = home.earnings.previousMonth > 0
      ? ((home.earnings.month - home.earnings.previousMonth) / home.earnings.previousMonth) * 100
      : null;
    const currency = (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
    }).format(value);

    return providerSummary.map((item) => {
      if (item.id === 'today') return { ...item, value: currency(home.earnings.today), description: 'Recebido hoje' };
      if (item.id === 'month') return {
        ...item,
        value: currency(home.earnings.month),
        description: growth === null ? 'Sem histórico do mês anterior' : `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}% em relação ao mês passado`,
        trend: growth !== null && growth > 0 ? 'positive' as const : 'neutral' as const,
      };
      if (item.id === 'services') return { ...item, value: String(home.services.completedTotal), description: `${home.services.completedThisWeek} concluídos nesta semana` };
      return { ...item, value: home.rating.average.toFixed(1), description: `Com base em ${home.rating.count} avaliações` };
    });
  }

  private buildInsights() {
    const insights = this.home!.insights;
    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    return providerInsights
      .filter(({ id }) => id !== 'time')
      .map((item) => {
        if (item.id === 'popular') return { ...item, value: insights.mostRequestedService ?? 'Sem dados' };
        if (item.id === 'ticket') return { ...item, value: currency.format(insights.averageTicket) };
        if (item.id === 'region') return { ...item, value: insights.mostServedNeighborhood ?? 'Sem dados' };
        return { ...item, value: insights.monthlyGrowth === null ? 'Sem histórico' : `${insights.monthlyGrowth >= 0 ? '+' : ''}${insights.monthlyGrowth.toFixed(0)}%` };
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
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));
  }
}
