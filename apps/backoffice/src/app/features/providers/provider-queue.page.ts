import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

import {
  PROVIDER_STATUSES,
  ProviderPage,
  ProviderPageQuery,
  ProviderQueueItem,
  ProviderStatus
} from './provider-admin.models';
import { ProviderAdminService } from './provider-admin.service';

@Component({
  selector: 'bo-provider-queue-page',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  templateUrl: './provider-queue.page.html',
  styleUrl: './providers.scss'
})
export class ProviderQueuePage {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #providers = inject(ProviderAdminService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = PROVIDER_STATUSES;
  readonly page = signal<ProviderPage<ProviderQueueItem> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filters = signal({
    status: '',
    submittedFrom: '',
    submittedTo: ''
  });

  constructor() {
    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const query = this.queryFromParamMap(params);
      this.filters.set({
        status: query.status ?? '',
        submittedFrom: toDateInputValue(query.submittedFrom),
        submittedTo: toDateInputValue(query.submittedTo)
      });
      this.load(query);
    });
  }

  queryFromRoute(): ProviderPageQuery {
    return this.queryFromParamMap(this.#route.snapshot.queryParamMap);
  }

  queryFromParamMap(params: ParamMap): ProviderPageQuery {
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 25);
    const status = params.get('status');

    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
      status: isProviderStatus(status) ? status : undefined,
      submittedFrom: params.get('submittedFrom') ?? undefined,
      submittedTo: params.get('submittedTo') ?? undefined
    };
  }

  applyFilters(): void {
    const filters = this.filters();
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({
        page: 1,
        limit: this.page()?.meta.limit ?? this.queryFromRoute().limit ?? 25,
        status: isProviderStatus(filters.status) ? filters.status : undefined,
        submittedFrom: toIsoStart(filters.submittedFrom),
        submittedTo: toIsoEnd(filters.submittedTo)
      })
    });
  }

  updateFilter(name: 'status' | 'submittedFrom' | 'submittedTo', value: string): void {
    this.filters.set({ ...this.filters(), [name]: value });
  }

  clearFilters(): void {
    this.filters.set({ status: '', submittedFrom: '', submittedTo: '' });
    this.applyFilters();
  }

  goToPage(page: number): void {
    const query = this.queryFromRoute();
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({ ...query, page })
    });
  }

  statusLabel(status: ProviderStatus): string {
    return statusLabels[status];
  }

  statusIcon(status: ProviderStatus): string {
    return statusIcons[status];
  }

  private load(query: ProviderPageQuery): void {
    this.loading.set(true);
    this.error.set('');
    this.#providers.list(query).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.page.set(null);
        this.error.set('Provider queue could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}

const statusLabels: Record<ProviderStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  BLOCKED: 'Blocked'
};

const statusIcons: Record<ProviderStatus, string> = {
  PENDING: '...',
  APPROVED: 'OK',
  REJECTED: '!',
  BLOCKED: 'x'
};

function isProviderStatus(value: string | null): value is ProviderStatus {
  return PROVIDER_STATUSES.includes(value as ProviderStatus);
}

function toDateInputValue(value: string | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function toIsoStart(value: string): string | undefined {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function toIsoEnd(value: string): string | undefined {
  return value ? `${value}T23:59:59.999Z` : undefined;
}

function cleanQuery(query: ProviderPageQuery): ProviderPageQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  ) as ProviderPageQuery;
}
