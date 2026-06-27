import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
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

@Component({
  selector: 'app-provider-home',
  imports: [CurrencyPipe, FontAwesomeModule, ProviderRevenueChartComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class ProviderHomePage {
  readonly summary = providerSummary;
  readonly revenue = providerRevenue;
  readonly services = completedServices;
  readonly insights = providerInsights;
  readonly requests = signal(pendingRequests.map((request) => ({ ...request })));
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

  updateRequestStatus(id: number, status: Exclude<RequestStatus, 'pending'>): void {
    this.requests.update((requests) =>
      requests.map((request) => (request.id === id ? { ...request, status } : request)),
    );
  }

  ratingLabel(rating: number): string {
    return `${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`;
  }
}
