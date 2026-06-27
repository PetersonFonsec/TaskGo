import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

import { RevenueByMonth } from '@modules/providers/home/data';

@Component({
  selector: 'app-provider-revenue-chart',
  imports: [CurrencyPipe],
  templateUrl: './provider-revenue-chart.html',
  styleUrl: './provider-revenue-chart.scss',
})
export class ProviderRevenueChartComponent {
  readonly data = input.required<RevenueByMonth[]>();
  readonly maxRevenue = computed(() => Math.max(...this.data().map(({ revenue }) => revenue), 1));

  barHeight(revenue: number): number {
    return Math.round((revenue / this.maxRevenue()) * 100);
  }
}
