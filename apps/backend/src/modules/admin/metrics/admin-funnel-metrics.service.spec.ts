import { BadRequestException } from '@nestjs/common';
import {
  Prisma,
  ProviderBankAccountStatus,
  ProviderPayoutSyncStatus,
  ProviderStatus,
  ServiceStatus,
} from '@prisma/client';

import { FunnelWeeklyRow } from './admin-funnel-metrics.queries';
import {
  AdminFunnelMetricsService,
  startOfLocalWeek,
} from './admin-funnel-metrics.service';

function weeklyRow(overrides: Partial<FunnelWeeklyRow>): FunnelWeeklyRow {
  return {
    week_start: '2026-09-21',
    iso_week: '2026-W39',
    created: 0,
    acceptance_eligible: 0,
    accepted_within_2h: 0,
    accepted_in_cohort: 0,
    median_accept_seconds: null,
    accepted: 0,
    accepted_then_paid: 0,
    paid: 0,
    completed: 0,
    completed_paid: 0,
    canceled: 0,
    rejected: 0,
    ...overrides,
  };
}

describe('AdminFunnelMetricsService', () => {
  // Quinta-feira, 01/10/2026 12:00 em São Paulo.
  const now = new Date('2026-10-01T15:00:00.000Z');
  let service: AdminFunnelMetricsService;
  let prisma: {
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    provider: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
      provider: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new AdminFunnelMetricsService(prisma as any);
  });

  function sqlCalls() {
    return prisma.$queryRaw.mock.calls.map(([sql]) => sql as Prisma.Sql);
  }

  it('defaults to the last 8 ISO weeks in America/Sao_Paulo', async () => {
    const result = await service.getFunnel({}, now);

    expect(result.period).toEqual({
      from: new Date('2026-08-10T03:00:00.000Z'),
      to: now,
      timezone: 'America/Sao_Paulo',
      defaultWeeks: 8,
      maxWeeks: 26,
    });
    const [weekly, rehire] = sqlCalls();
    expect(weekly.values).toEqual(
      expect.arrayContaining([
        '2026-08-10T03:00:00.000Z',
        now.toISOString(),
        // pedidos dos últimos 120 minutos ainda não entram na taxa de aceite
        '2026-10-01T13:00:00.000Z',
        'America/Sao_Paulo',
      ]),
    );
    expect(weekly.sql).toContain('GROUPING SETS');
    expect(rehire.values).toEqual([
      '2026-06-03T15:00:00.000Z',
      '2026-08-02T15:00:00.000Z',
    ]);
  });

  it('aligns a custom start date to the beginning of its local ISO week', async () => {
    const result = await service.getFunnel(
      {
        from: '2026-09-23T12:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
      },
      now,
    );

    expect(result.period.from).toEqual(new Date('2026-09-21T03:00:00.000Z'));
    expect(result.period.to).toEqual(new Date('2026-09-30T23:59:59.000Z'));
  });

  it.each([
    [
      { from: '2026-09-30T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
      'Funnel from date must be before to date',
    ],
    [
      { from: '2026-01-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
      'Funnel date range cannot exceed 26 weeks',
    ],
    [{ from: 'not-a-date' }, 'Invalid funnel date range'],
  ])('rejects invalid ranges %j', async (query, message) => {
    await expect(service.getFunnel(query, now)).rejects.toThrow(
      new BadRequestException(message),
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('counts providers per cumulative onboarding stage in the database', async () => {
    prisma.provider.count
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(7);

    const result = await service.getFunnel({}, now);

    const approved = { status: ProviderStatus.APPROVED };
    const offer = {
      services: {
        some: {
          status: ServiceStatus.ATIVO,
          availability: { not: Prisma.AnyNull },
        },
      },
    };
    const payout = {
      payoutProfile: {
        is: {
          syncStatus: ProviderPayoutSyncStatus.READY,
          bankAccountStatus: ProviderBankAccountStatus.CONFIRMED,
        },
      },
    };
    expect(prisma.provider.count.mock.calls).toEqual([
      [],
      [{ where: approved }],
      [{ where: { AND: [approved, offer] } }],
      [{ where: { AND: [approved, offer, payout] } }],
    ]);
    expect(result.providerOnboarding).toEqual({
      registered: 40,
      approved: 25,
      withActiveScheduledOffer: 12,
      readyToSell: 7,
    });
    expect(result.inputs.providersReadyToSell).toBe(7);
  });

  it('maps weekly aggregates, rates, totals and the North Star', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        weeklyRow({
          week_start: '2026-09-21',
          iso_week: '2026-W39',
          created: 3,
          acceptance_eligible: 3,
          accepted_within_2h: 1,
          accepted_in_cohort: 2,
          median_accept_seconds: 10_800,
          accepted: 2,
          accepted_then_paid: 1,
          paid: 1,
          completed: 1,
          completed_paid: 1,
        }),
        weeklyRow({
          week_start: '2026-09-28',
          iso_week: '2026-W40',
          created: 1,
          completed: 2,
          completed_paid: 2,
          canceled: 1,
          rejected: 1,
        }),
        weeklyRow({
          week_start: null,
          iso_week: null,
          created: 4,
          acceptance_eligible: 3,
          accepted_within_2h: 1,
          accepted_in_cohort: 2,
          median_accept_seconds: 10_800,
        }),
      ])
      .mockResolvedValueOnce([
        { clients: 4, rehired: 1, rehired_same_provider: BigInt(1) },
      ]);

    const result = await service.getFunnel(
      { from: '2026-09-21T03:00:00.000Z', to: now.toISOString() },
      now,
    );

    expect(result.weeks).toHaveLength(2);
    expect(result.weeks[0]).toEqual({
      weekStart: '2026-09-21',
      isoWeek: '2026-W39',
      created: 3,
      accepted: 2,
      paid: 1,
      completed: 1,
      completedPaid: 1,
      canceled: 0,
      rejected: 0,
      acceptance: {
        eligible: 3,
        acceptedWithin2h: 1,
        rate: 0.3333,
        acceptedOrders: 2,
        medianMinutes: 180,
      },
      acceptToPaid: { accepted: 2, paid: 1, rate: 0.5 },
    });
    expect(result.weeks[1].acceptance.rate).toBeNull();
    expect(result.weeks[1].acceptToPaid.rate).toBeNull();
    expect(result.totals).toEqual({
      created: 4,
      accepted: 2,
      paid: 1,
      completed: 3,
      completedPaid: 3,
      canceled: 1,
      rejected: 1,
    });
    expect(result.northStar).toEqual({
      total: 3,
      weeklyAverage: 1.5,
      // a semana W40 ainda está em andamento em 01/10
      lastCompleteWeek: {
        weekStart: '2026-09-21',
        isoWeek: '2026-W39',
        value: 1,
      },
    });
    expect(result.inputs.acceptance).toEqual({
      eligible: 3,
      acceptedWithin2h: 1,
      rate: 0.3333,
      acceptedOrders: 2,
      medianMinutes: 180,
    });
    expect(result.inputs.acceptToPaid).toEqual({
      accepted: 2,
      paid: 1,
      rate: 0.5,
    });
    expect(result.inputs.rehire60d).toEqual({
      cohortFrom: new Date('2026-06-03T15:00:00.000Z'),
      cohortTo: new Date('2026-08-02T15:00:00.000Z'),
      clients: 4,
      rehired: 1,
      rate: 0.25,
      rehiredSameProvider: 1,
      sameProviderRate: 0.25,
    });
  });

  it('returns empty rates instead of dividing by zero', async () => {
    const result = await service.getFunnel({}, now);

    expect(result.weeks).toEqual([]);
    expect(result.northStar).toEqual({
      total: 0,
      weeklyAverage: 0,
      lastCompleteWeek: null,
    });
    expect(result.inputs.acceptance.rate).toBeNull();
    expect(result.inputs.acceptance.medianMinutes).toBeNull();
    expect(result.inputs.acceptToPaid.rate).toBeNull();
    expect(result.inputs.rehire60d.rate).toBeNull();
  });
});

describe('startOfLocalWeek', () => {
  it.each([
    // segunda 00:00 em São Paulo
    ['2026-09-28T03:00:00.000Z', '2026-09-28T03:00:00.000Z'],
    // domingo 23:59 em São Paulo ainda pertence à semana anterior
    ['2026-09-28T02:59:00.000Z', '2026-09-21T03:00:00.000Z'],
    ['2026-10-01T15:00:00.000Z', '2026-09-28T03:00:00.000Z'],
    ['2027-01-01T12:00:00.000Z', '2026-12-28T03:00:00.000Z'],
  ])('maps %s to %s', (input, expected) => {
    expect(startOfLocalWeek(new Date(input)).toISOString()).toBe(expected);
  });
});
