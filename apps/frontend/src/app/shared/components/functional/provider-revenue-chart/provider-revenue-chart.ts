import { Component, computed, input } from '@angular/core';

import { RevenueByMonth } from '@modules/providers/home/data';

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

@Component({
  selector: 'app-provider-revenue-chart',
  templateUrl: './provider-revenue-chart.html',
  styleUrl: './provider-revenue-chart.scss',
})
export class ProviderRevenueChartComponent {
  readonly data = input.required<RevenueByMonth[]>();
  readonly maxRevenue = computed(() => Math.max(...this.data().map(({ revenue }) => revenue), 1));

  /**
   * "1.540", no formato do resto da tela (sem LOCALE_ID, o CurrencyPipe
   * usava "R$1,540"). O "R$" fica num span à parte para o valor quebrar em
   * duas linhas quando a coluna é estreita.
   */
  amount(revenue: number): string {
    return NUMBER.format(Number.isFinite(revenue) ? revenue : 0);
  }

  barHeight(revenue: number): number {
    return Math.round((revenue / this.maxRevenue()) * 100);
  }
}
