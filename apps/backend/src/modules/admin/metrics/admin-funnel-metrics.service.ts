import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  ProviderBankAccountStatus,
  ProviderPayoutSyncStatus,
  ProviderStatus,
  ServiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  FUNNEL_TIMEZONE,
  FunnelRehireRow,
  FunnelWeeklyRow,
  funnelRehireSql,
  funnelWeeklySql,
} from './admin-funnel-metrics.queries';
import { AdminFunnelMetricsQueryDto } from './dto/admin-funnel-metrics-query.dto';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
// America/Sao_Paulo não adota horário de verão desde 2019 (UTC-3 fixo).
const SAO_PAULO_OFFSET_MS = -3 * HOUR_MS;

export const FUNNEL_DEFAULT_WEEKS = 8;
export const FUNNEL_MAX_WEEKS = 26;
export const FUNNEL_ACCEPTANCE_TARGET_HOURS = 2;
export const FUNNEL_REHIRE_WINDOW_DAYS = 60;

const activeScheduledOffer: Prisma.ProviderWhereInput = {
  services: {
    some: {
      status: ServiceStatus.ATIVO,
      availability: { not: Prisma.AnyNull },
    },
  },
};

const payoutReady: Prisma.ProviderWhereInput = {
  payoutProfile: {
    is: {
      syncStatus: ProviderPayoutSyncStatus.READY,
      bankAccountStatus: ProviderBankAccountStatus.CONFIRMED,
    },
  },
};

@Injectable()
export class AdminFunnelMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFunnel(query: AdminFunnelMetricsQueryDto, now = new Date()) {
    const window = this.resolveWindow(query, now);
    const acceptanceCutoff = new Date(
      Math.min(window.to.getTime(), now.getTime()) -
        FUNNEL_ACCEPTANCE_TARGET_HOURS * HOUR_MS,
    );
    const rehireCohort = {
      from: new Date(
        window.to.getTime() - 2 * FUNNEL_REHIRE_WINDOW_DAYS * DAY_MS,
      ),
      to: new Date(window.to.getTime() - FUNNEL_REHIRE_WINDOW_DAYS * DAY_MS),
    };
    const approved: Prisma.ProviderWhereInput = {
      status: ProviderStatus.APPROVED,
    };

    const [weeklyRows, rehireRows, onboarding] = await Promise.all([
      this.prisma.$queryRaw<FunnelWeeklyRow[]>(
        funnelWeeklySql({ ...window, acceptanceCutoff }),
      ),
      this.prisma.$queryRaw<FunnelRehireRow[]>(
        funnelRehireSql(rehireCohort.from, rehireCohort.to),
      ),
      this.prisma.$transaction([
        this.prisma.provider.count(),
        this.prisma.provider.count({ where: approved }),
        this.prisma.provider.count({
          where: { AND: [approved, activeScheduledOffer] },
        }),
        this.prisma.provider.count({
          where: { AND: [approved, activeScheduledOffer, payoutReady] },
        }),
      ]),
    ]);

    const weeks = weeklyRows
      .filter((row) => row.week_start !== null)
      .map((row) => this.toWeek(row));
    const cohortTotals = weeklyRows.find((row) => row.week_start === null);
    const totals = this.sumWeeks(weeks);
    const [registered, approvedCount, withActiveScheduledOffer, readyToSell] =
      onboarding;
    const rehire = rehireRows[0] ?? {
      clients: 0,
      rehired: 0,
      rehired_same_provider: 0,
    };
    const lastCompleteWeek =
      [...weeks]
        .reverse()
        .find(
          (week) =>
            new Date(`${week.weekStart}T00:00:00.000Z`).getTime() -
              SAO_PAULO_OFFSET_MS +
              WEEK_MS <=
            Math.min(window.to.getTime(), now.getTime()),
        ) ?? null;

    return {
      period: {
        from: window.from,
        to: window.to,
        timezone: FUNNEL_TIMEZONE,
        defaultWeeks: FUNNEL_DEFAULT_WEEKS,
        maxWeeks: FUNNEL_MAX_WEEKS,
      },
      northStar: {
        total: totals.completedPaid,
        weeklyAverage: weeks.length
          ? round(totals.completedPaid / weeks.length, 1)
          : 0,
        lastCompleteWeek: lastCompleteWeek
          ? {
              weekStart: lastCompleteWeek.weekStart,
              isoWeek: lastCompleteWeek.isoWeek,
              value: lastCompleteWeek.completedPaid,
            }
          : null,
      },
      inputs: {
        providersReadyToSell: readyToSell,
        acceptance: this.toAcceptance({
          eligible: cohortTotals?.acceptance_eligible ?? 0,
          acceptedWithin2h: cohortTotals?.accepted_within_2h ?? 0,
          medianSeconds: cohortTotals?.median_accept_seconds ?? null,
          acceptedOrders: cohortTotals?.accepted_in_cohort ?? 0,
        }),
        acceptToPaid: {
          accepted: totals.accepted,
          paid: totals.acceptedThenPaid,
          rate: rate(totals.acceptedThenPaid, totals.accepted),
        },
        rehire60d: {
          cohortFrom: rehireCohort.from,
          cohortTo: rehireCohort.to,
          clients: toNumber(rehire.clients),
          rehired: toNumber(rehire.rehired),
          rate: rate(toNumber(rehire.rehired), toNumber(rehire.clients)),
          rehiredSameProvider: toNumber(rehire.rehired_same_provider),
          sameProviderRate: rate(
            toNumber(rehire.rehired_same_provider),
            toNumber(rehire.clients),
          ),
        },
      },
      providerOnboarding: {
        registered,
        approved: approvedCount,
        withActiveScheduledOffer,
        readyToSell,
      },
      totals: {
        created: totals.created,
        accepted: totals.accepted,
        paid: totals.paid,
        completed: totals.completed,
        completedPaid: totals.completedPaid,
        canceled: totals.canceled,
        rejected: totals.rejected,
      },
      weeks,
    };
  }

  private resolveWindow(query: AdminFunnelMetricsQueryDto, now: Date) {
    const to = query.to ? new Date(query.to) : now;
    const requestedFrom = query.from
      ? new Date(query.from)
      : new Date(
          startOfLocalWeek(to).getTime() - (FUNNEL_DEFAULT_WEEKS - 1) * WEEK_MS,
        );

    if (Number.isNaN(to.getTime()) || Number.isNaN(requestedFrom.getTime())) {
      throw new BadRequestException('Invalid funnel date range');
    }
    if (requestedFrom > to) {
      throw new BadRequestException('Funnel from date must be before to date');
    }

    const from = startOfLocalWeek(requestedFrom);
    const weeks =
      Math.floor((startOfLocalWeek(to).getTime() - from.getTime()) / WEEK_MS) +
      1;
    if (weeks > FUNNEL_MAX_WEEKS) {
      throw new BadRequestException(
        `Funnel date range cannot exceed ${FUNNEL_MAX_WEEKS} weeks`,
      );
    }

    return { from, to };
  }

  private toWeek(row: FunnelWeeklyRow) {
    const accepted = toNumber(row.accepted);
    const acceptedThenPaid = toNumber(row.accepted_then_paid);

    return {
      weekStart: row.week_start as string,
      isoWeek: row.iso_week as string,
      created: toNumber(row.created),
      accepted,
      paid: toNumber(row.paid),
      completed: toNumber(row.completed),
      completedPaid: toNumber(row.completed_paid),
      canceled: toNumber(row.canceled),
      rejected: toNumber(row.rejected),
      acceptance: this.toAcceptance({
        eligible: row.acceptance_eligible,
        acceptedWithin2h: row.accepted_within_2h,
        medianSeconds: row.median_accept_seconds,
        acceptedOrders: row.accepted_in_cohort,
      }),
      acceptToPaid: {
        accepted,
        paid: acceptedThenPaid,
        rate: rate(acceptedThenPaid, accepted),
      },
    };
  }

  private toAcceptance(values: {
    eligible: number | bigint;
    acceptedWithin2h: number | bigint;
    medianSeconds: number | null;
    acceptedOrders: number | bigint;
  }) {
    const eligible = toNumber(values.eligible);
    const acceptedWithin2h = toNumber(values.acceptedWithin2h);

    return {
      eligible,
      acceptedWithin2h,
      rate: rate(acceptedWithin2h, eligible),
      acceptedOrders: toNumber(values.acceptedOrders),
      medianMinutes:
        values.medianSeconds === null || values.medianSeconds === undefined
          ? null
          : round(Number(values.medianSeconds) / 60, 1),
    };
  }

  private sumWeeks(weeks: ReturnType<AdminFunnelMetricsService['toWeek']>[]) {
    return weeks.reduce(
      (total, week) => ({
        created: total.created + week.created,
        accepted: total.accepted + week.accepted,
        acceptedThenPaid: total.acceptedThenPaid + week.acceptToPaid.paid,
        paid: total.paid + week.paid,
        completed: total.completed + week.completed,
        completedPaid: total.completedPaid + week.completedPaid,
        canceled: total.canceled + week.canceled,
        rejected: total.rejected + week.rejected,
      }),
      {
        created: 0,
        accepted: 0,
        acceptedThenPaid: 0,
        paid: 0,
        completed: 0,
        completedPaid: 0,
        canceled: 0,
        rejected: 0,
      },
    );
  }
}

/** Segunda-feira 00:00 em America/Sao_Paulo, expressa em UTC. */
export function startOfLocalWeek(date: Date): Date {
  const local = new Date(date.getTime() + SAO_PAULO_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const localMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
  );

  return new Date(localMidnight - SAO_PAULO_OFFSET_MS);
}

function toNumber(value: number | bigint | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? round(numerator / denominator, 4) : null;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
