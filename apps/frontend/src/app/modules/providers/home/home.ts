import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-provider-home',
  imports: [CurrencyPipe, FontAwesomeModule, ProviderRevenueChartComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class ProviderHomePage {
  private readonly session = inject(UserLoggedService).user();
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
  readonly pendingCount = computed(
    () => this.requests().filter(({ status }) => status === 'pending').length,
  );

  readonly icons = {
    calendar: faCalendarDays,
    check: faCheck,
    clock: faClock,
    location: faLocationDot,
    star: faStar,
  };

  updateRequestStatus(id: string | number, status: Exclude<RequestStatus, 'pending'>): void {
    this.requests.update((requests) =>
      requests.map((request) => (request.id === id ? { ...request, status } : request)),
    );
  }

  ratingLabel(rating: number): string {
    return `${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`;
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
