import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { TaskGoAdminRole } from '@taskgo/shared';
import {
  PROVIDER_ACTIONS,
  ProviderDashboard,
  ProviderDashboardAction,
  ProviderDashboardQuery,
  ProviderDecisionAction,
  ProviderStatus,
} from '@app/features/providers/provider-admin.models';
import { ProviderAdminService } from '@app/features/providers/provider-admin.service';

@Component({
  selector: 'bo-dashboard-page',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  readonly #auth = inject(AdminAuthService);
  readonly #providers = inject(ProviderAdminService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly operator = this.#auth.operator;
  protected readonly allowed = computed(() => canReadDashboard(this.operator()?.role));
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly dashboard = signal<ProviderDashboard | null>(null);
  protected readonly selectedPeriod = signal<DashboardPeriodKey>('default');
  protected readonly periodOptions = DASHBOARD_PERIODS;

  constructor() {
    if (this.allowed()) {
      this.load({});
    }
  }

  protected changePeriod(period: string): void {
    const selected = isDashboardPeriodKey(period) ? period : 'default';
    this.selectedPeriod.set(selected);
    this.load(queryForPeriod(selected));
  }

  protected retry(): void {
    this.load(queryForPeriod(this.selectedPeriod()));
  }

  protected metricCards(dashboard: ProviderDashboard): readonly DashboardMetricCard[] {
    return [
      {
        label: 'Pending providers',
        value: dashboard.queue.pending,
        status: dashboard.queue.pending > 0 ? 'Review queue requires action' : 'Queue clear',
        icon: dashboard.queue.pending > 0 ? 'Needs review' : 'Clear',
        queryParams: queueQuery(dashboard, 'PENDING'),
      },
      {
        label: 'Approvals',
        value: dashboard.decisions.approve,
        status: 'Providers approved in this period',
        icon: 'Approve',
        queryParams: queueQuery(dashboard, 'APPROVED'),
      },
      {
        label: 'Rejections',
        value: dashboard.decisions.reject,
        status: 'Applications closed in this period',
        icon: 'Reject',
        queryParams: queueQuery(dashboard, 'REJECTED'),
      },
      {
        label: 'Blocks and unblocks',
        value: dashboard.decisions.block + dashboard.decisions.unblock,
        status: `${dashboard.decisions.block} blocked, ${dashboard.decisions.unblock} unblocked`,
        icon: 'Restrict',
        queryParams: queueQuery(dashboard, 'BLOCKED'),
      },
    ];
  }

  protected averageReviewLabel(dashboard: ProviderDashboard): string {
    if (dashboard.reviewDuration.averageHours === null) {
      return 'No completed provider reviews';
    }

    if (dashboard.reviewDuration.averageHours < 1) {
      const minutes = Math.round(dashboard.reviewDuration.averageHours * 60);
      return `${minutes} min average`;
    }

    return `${dashboard.reviewDuration.averageHours.toFixed(1)} hr average`;
  }

  protected actionLabel(action: ProviderDecisionAction): string {
    return PROVIDER_ACTIONS[action].label;
  }

  protected actionStatus(action: ProviderDashboardAction): string {
    return `${statusLabel(action.fromStatus)} to ${statusLabel(action.toStatus)}`;
  }

  protected providerLink(action: ProviderDashboardAction): readonly string[] {
    return ['/providers', action.provider.id];
  }

  private load(query: ProviderDashboardQuery): void {
    this.loading.set(true);
    this.error.set('');
    this.#providers
      .dashboard(query)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.loading.set(false);
        },
        error: () => {
          this.dashboard.set(null);
          this.error.set('Provider dashboard metrics could not be loaded.');
          this.loading.set(false);
        },
      });
  }
}

export type DashboardPeriodKey = 'default' | '7' | '30' | '90';

interface DashboardPeriodOption {
  readonly value: DashboardPeriodKey;
  readonly label: string;
}

interface DashboardMetricCard {
  readonly label: string;
  readonly value: number;
  readonly status: string;
  readonly icon: string;
  readonly queryParams: {
    readonly status: ProviderStatus;
    readonly submittedFrom: string;
    readonly submittedTo: string;
  };
}

const DASHBOARD_PERIODS: readonly DashboardPeriodOption[] = [
  { value: 'default', label: 'Default 30 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function canReadDashboard(role: TaskGoAdminRole | undefined): boolean {
  return role === 'ADMINISTRATOR' || role === 'SUPPORT';
}

function isDashboardPeriodKey(period: string): period is DashboardPeriodKey {
  return DASHBOARD_PERIODS.some((option) => option.value === period);
}

function queryForPeriod(period: DashboardPeriodKey): ProviderDashboardQuery {
  if (period === 'default') {
    return {};
  }

  const days = Number(period);
  const to = new Date(Date.now());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function queueQuery(dashboard: ProviderDashboard, status: ProviderStatus) {
  return {
    status,
    submittedFrom: dashboard.period.from,
    submittedTo: dashboard.period.to,
  };
}

function statusLabel(status: ProviderStatus): string {
  return {
    PENDING: 'Pending review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    BLOCKED: 'Blocked',
  }[status];
}
