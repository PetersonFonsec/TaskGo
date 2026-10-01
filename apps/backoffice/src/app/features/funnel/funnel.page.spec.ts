import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';

import { FunnelMetrics } from './funnel-metrics.models';
import { FunnelMetricsService } from './funnel-metrics.service';
import { FunnelPage } from './funnel.page';

describe('FunnelPage', () => {
  let service: jasmine.SpyObj<FunnelMetricsService>;

  afterEach(() => TestBed.resetTestingModule());

  it('highlights the North Star and renders the input metrics', () => {
    const fixture = setup(seededFunnel());
    const northStar = fixture.debugElement.query(By.css('.north-star')).nativeElement
      .textContent as string;

    expect(service.funnel).toHaveBeenCalledWith({});
    expect(northStar).toContain('Serviços concluídos e pagos por semana');
    expect(northStar).toContain('7');
    expect(northStar).toContain('2026-W39');
    expect(northStar).toContain('12');

    const cards = fixture.debugElement
      .queryAll(By.css('.input-card'))
      .map((card) => card.nativeElement.textContent as string);
    expect(cards.length).toBe(4);
    expect(cards[0]).toContain('Prestadores prontos para vender');
    expect(cards[0]).toContain('de 40 cadastrados');
    expect(cards[1]).toContain('Aceite em até 2 h');
    expect(cards[1]).toContain('75%');
    expect(cards[1]).toContain('mediana 45 min');
    expect(cards[2]).toContain('62,5%');
    expect(cards[3]).toContain('25%');
  });

  it('renders the weekly table with totals and empty rates', () => {
    const fixture = setup(seededFunnel());
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));

    expect(rows.length).toBe(2);
    expect(rows[0].nativeElement.textContent).toContain('2026-W39');
    expect(rows[0].nativeElement.textContent).toContain('2,5 h');
    expect(rows[1].nativeElement.textContent).toContain('—');
    expect(text(fixture.debugElement.query(By.css('tfoot')).nativeElement)).toContain('Total');
  });

  it('shows the onboarding stages as a share of registered providers', () => {
    const fixture = setup(seededFunnel());
    const stages = text(fixture.debugElement.query(By.css('.stages')).nativeElement);

    expect(stages).toContain('Cadastrados');
    expect(stages).toContain('100%');
    expect(stages).toContain('Com recebimento pronto');
    expect(stages).toContain('17,5%');
  });

  it('reloads metrics for the selected period', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-01T15:00:00.000Z'));
    try {
      const fixture = setup(seededFunnel());
      const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
      select.value = '4';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(service.funnel).toHaveBeenCalledWith({
        from: '2026-09-10T15:00:00.000Z',
        to: '2026-10-01T15:00:00.000Z',
      });
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('keeps loading and error states accessible with retry', () => {
    const pending = new Subject<FunnelMetrics>();
    const fixture = setup(pending);

    expect(
      fixture.debugElement.query(By.css('[role="status"]')).nativeElement.textContent,
    ).toContain('Carregando métricas do funil');

    pending.error(new Error('network'));
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('[role="alert"]')).nativeElement;
    expect(alert.textContent).toContain('Não foi possível carregar as métricas do funil.');

    service.funnel.and.returnValue(of(seededFunnel()));
    (alert.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.funnel).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.css('.north-star'))).not.toBeNull();
  });

  function setup(response: FunnelMetrics | Subject<FunnelMetrics>): ComponentFixture<FunnelPage> {
    service = jasmine.createSpyObj<FunnelMetricsService>('FunnelMetricsService', ['funnel']);
    service.funnel.and.returnValue(
      response instanceof Subject ? response.asObservable() : of(response),
    );

    TestBed.configureTestingModule({
      imports: [FunnelPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: FunnelMetricsService, useValue: service },
      ],
    });

    const fixture = TestBed.createComponent(FunnelPage);
    fixture.detectChanges();
    return fixture;
  }
});

function text(element: HTMLElement): string {
  return element.textContent ?? '';
}

function seededFunnel(): FunnelMetrics {
  return {
    period: {
      from: '2026-09-21T03:00:00.000Z',
      to: '2026-10-01T15:00:00.000Z',
      timezone: 'America/Sao_Paulo',
      defaultWeeks: 8,
      maxWeeks: 26,
    },
    northStar: {
      total: 12,
      weeklyAverage: 6,
      lastCompleteWeek: { weekStart: '2026-09-21', isoWeek: '2026-W39', value: 7 },
    },
    inputs: {
      providersReadyToSell: 7,
      acceptance: {
        eligible: 8,
        acceptedWithin2h: 6,
        rate: 0.75,
        acceptedOrders: 7,
        medianMinutes: 45,
      },
      acceptToPaid: { accepted: 8, paid: 5, rate: 0.625 },
      rehire60d: {
        cohortFrom: '2026-06-03T15:00:00.000Z',
        cohortTo: '2026-08-02T15:00:00.000Z',
        clients: 4,
        rehired: 1,
        rate: 0.25,
        rehiredSameProvider: 1,
        sameProviderRate: 0.25,
      },
    },
    providerOnboarding: {
      registered: 40,
      approved: 25,
      withActiveScheduledOffer: 12,
      readyToSell: 7,
    },
    totals: {
      created: 10,
      accepted: 8,
      paid: 5,
      completed: 13,
      completedPaid: 12,
      canceled: 1,
      rejected: 0,
    },
    weeks: [
      {
        weekStart: '2026-09-21',
        isoWeek: '2026-W39',
        created: 8,
        accepted: 8,
        paid: 5,
        completed: 8,
        completedPaid: 7,
        canceled: 1,
        rejected: 0,
        acceptance: {
          eligible: 8,
          acceptedWithin2h: 6,
          rate: 0.75,
          acceptedOrders: 7,
          medianMinutes: 150,
        },
        acceptToPaid: { accepted: 8, paid: 5, rate: 0.625 },
      },
      {
        weekStart: '2026-09-28',
        isoWeek: '2026-W40',
        created: 2,
        accepted: 0,
        paid: 0,
        completed: 5,
        completedPaid: 5,
        canceled: 0,
        rejected: 0,
        acceptance: {
          eligible: 0,
          acceptedWithin2h: 0,
          rate: null,
          acceptedOrders: 0,
          medianMinutes: null,
        },
        acceptToPaid: { accepted: 0, paid: 0, rate: null },
      },
    ],
  };
}
