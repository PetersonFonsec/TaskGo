import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { FunnelMetrics, FunnelMetricsQuery } from './funnel-metrics.models';
import { FunnelMetricsService } from './funnel-metrics.service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type FunnelPeriodKey = 'default' | '4' | '12' | '26';

interface FunnelPeriodOption {
  readonly value: FunnelPeriodKey;
  readonly label: string;
}

interface FunnelInputCard {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

interface FunnelStage {
  readonly label: string;
  readonly value: number;
  readonly share: number | null;
}

const FUNNEL_PERIODS: readonly FunnelPeriodOption[] = [
  { value: 'default', label: 'Últimas 8 semanas' },
  { value: '4', label: 'Últimas 4 semanas' },
  { value: '12', label: 'Últimas 12 semanas' },
  { value: '26', label: 'Últimas 26 semanas' },
];

@Component({
  selector: 'bo-funnel-page',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './funnel.page.html',
  styleUrl: './funnel.page.scss',
})
export class FunnelPage {
  readonly #metrics = inject(FunnelMetricsService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly funnel = signal<FunnelMetrics | null>(null);
  protected readonly selectedPeriod = signal<FunnelPeriodKey>('default');
  protected readonly periodOptions = FUNNEL_PERIODS;

  constructor() {
    this.load({});
  }

  protected changePeriod(period: string): void {
    const selected = FUNNEL_PERIODS.some((option) => option.value === period)
      ? (period as FunnelPeriodKey)
      : 'default';
    this.selectedPeriod.set(selected);
    this.load(queryForPeriod(selected));
  }

  protected retry(): void {
    this.load(queryForPeriod(this.selectedPeriod()));
  }

  protected inputCards(metrics: FunnelMetrics): readonly FunnelInputCard[] {
    const { inputs, providerOnboarding } = metrics;

    return [
      {
        label: 'Prestadores prontos para vender',
        value: String(inputs.providersReadyToSell),
        detail: `de ${providerOnboarding.registered} cadastrados (aprovados, com oferta ativa com agenda e recebimento pronto)`,
      },
      {
        label: 'Aceite em até 2 h',
        value: formatRate(inputs.acceptance.rate),
        detail: `${inputs.acceptance.acceptedWithin2h} de ${inputs.acceptance.eligible} pedidos · mediana ${formatMinutes(inputs.acceptance.medianMinutes)}`,
      },
      {
        label: 'Conversão aceite → pagamento',
        value: formatRate(inputs.acceptToPaid.rate),
        detail: `${inputs.acceptToPaid.paid} de ${inputs.acceptToPaid.accepted} pedidos aceitos foram pagos`,
      },
      {
        label: 'Recontratação em 60 dias',
        value: formatRate(inputs.rehire60d.rate),
        detail: `${inputs.rehire60d.rehired} de ${inputs.rehire60d.clients} clientes · mesmo prestador ${formatRate(inputs.rehire60d.sameProviderRate)}`,
      },
    ];
  }

  protected stages(metrics: FunnelMetrics): readonly FunnelStage[] {
    const { registered, approved, withActiveScheduledOffer, readyToSell } =
      metrics.providerOnboarding;
    const share = (value: number) => (registered > 0 ? value / registered : null);

    return [
      { label: 'Cadastrados', value: registered, share: share(registered) },
      { label: 'Aprovados', value: approved, share: share(approved) },
      {
        label: 'Com oferta ativa e agenda',
        value: withActiveScheduledOffer,
        share: share(withActiveScheduledOffer),
      },
      { label: 'Com recebimento pronto', value: readyToSell, share: share(readyToSell) },
    ];
  }

  protected formatRate(rate: number | null): string {
    return formatRate(rate);
  }

  protected formatMinutes(minutes: number | null): string {
    return formatMinutes(minutes);
  }

  private load(query: FunnelMetricsQuery): void {
    this.loading.set(true);
    this.error.set('');
    this.#metrics
      .funnel(query)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (metrics) => {
          this.funnel.set(metrics);
          this.loading.set(false);
        },
        error: () => {
          this.funnel.set(null);
          this.error.set('Não foi possível carregar as métricas do funil.');
          this.loading.set(false);
        },
      });
  }
}

function queryForPeriod(period: FunnelPeriodKey): FunnelMetricsQuery {
  if (period === 'default') {
    return {};
  }

  // O backend alinha `from` ao início da semana ISO correspondente.
  const to = new Date(Date.now());
  const from = new Date(to.getTime() - (Number(period) - 1) * WEEK_MS);

  return { from: from.toISOString(), to: to.toISOString() };
}

function formatRate(rate: number | null): string {
  if (rate === null) {
    return '—';
  }

  return `${(rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) {
    return '—';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  return `${(minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
}
