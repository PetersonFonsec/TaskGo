export interface FunnelMetricsQuery {
  readonly from?: string;
  readonly to?: string;
}

export interface FunnelAcceptance {
  readonly eligible: number;
  readonly acceptedWithin2h: number;
  readonly rate: number | null;
  readonly acceptedOrders: number;
  readonly medianMinutes: number | null;
}

export interface FunnelConversion {
  readonly accepted: number;
  readonly paid: number;
  readonly rate: number | null;
}

export interface FunnelWeek {
  readonly weekStart: string;
  readonly isoWeek: string;
  readonly created: number;
  readonly accepted: number;
  readonly paid: number;
  readonly completed: number;
  readonly completedPaid: number;
  readonly canceled: number;
  readonly rejected: number;
  readonly acceptance: FunnelAcceptance;
  readonly acceptToPaid: FunnelConversion;
}

export interface FunnelMetrics {
  readonly period: {
    readonly from: string;
    readonly to: string;
    readonly timezone: string;
    readonly defaultWeeks: number;
    readonly maxWeeks: number;
  };
  readonly northStar: {
    readonly total: number;
    readonly weeklyAverage: number;
    readonly lastCompleteWeek: {
      readonly weekStart: string;
      readonly isoWeek: string;
      readonly value: number;
    } | null;
  };
  readonly inputs: {
    readonly providersReadyToSell: number;
    readonly acceptance: FunnelAcceptance;
    readonly acceptToPaid: FunnelConversion;
    readonly rehire60d: {
      readonly cohortFrom: string;
      readonly cohortTo: string;
      readonly clients: number;
      readonly rehired: number;
      readonly rate: number | null;
      readonly rehiredSameProvider: number;
      readonly sameProviderRate: number | null;
    };
  };
  readonly providerOnboarding: {
    readonly registered: number;
    readonly approved: number;
    readonly withActiveScheduledOffer: number;
    readonly readyToSell: number;
  };
  readonly totals: {
    readonly created: number;
    readonly accepted: number;
    readonly paid: number;
    readonly completed: number;
    readonly completedPaid: number;
    readonly canceled: number;
    readonly rejected: number;
  };
  readonly weeks: readonly FunnelWeek[];
}
