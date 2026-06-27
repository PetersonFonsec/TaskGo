import { Component } from '@angular/core';
import { providerRevenueChartData } from '@modules/providers/home/data';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-provider-revenue-chart',
  imports: [NgxChartsModule],
  templateUrl: './provider-revenue-chart.html',
  styleUrl: './provider-revenue-chart.scss',
})
export class ProviderRevenueChart {
  chartData = providerRevenueChartData;
  view: [number, number] = [700, 360];

  showXAxis = true;
  showYAxis = true; 
  gradient = false;
  showLegend = false;
  showXAxisLabel = false;
  xAxisLabel = 'Indicador';
  showYAxisLabel = false;
  yAxisLabel = 'Total';
  legendTitle = 'Periodo';
  showGridLines = false;

  colorScheme = {
    name: 'provider-dashboard',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#2f80ed', '#27ae60']
  };

  onSelect(data: unknown): void {
    console.log('Item clicked', JSON.parse(JSON.stringify(data)));
  }

  onActivate(data: unknown): void {
    console.log('Activate', JSON.parse(JSON.stringify(data)));
  }

  onDeactivate(data: unknown): void {
    console.log('Deactivate', JSON.parse(JSON.stringify(data)));
  }
}
