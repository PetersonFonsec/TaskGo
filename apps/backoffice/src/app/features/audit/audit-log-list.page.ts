import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';

import { AuditLogListItem, AuditLogPage, AuditLogQuery } from './audit-log.models';
import { AuditLogService } from './audit-log.service';

@Component({
  selector: 'bo-audit-log-list-page',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './audit-log-list.page.html',
  styleUrl: './audit-log.scss',
})
export class AuditLogListPage {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #audit = inject(AuditLogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly page = signal<AuditLogPage<AuditLogListItem> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filters = signal({
    operatorId: '',
    action: '',
    entityType: '',
    entityId: '',
    requestId: '',
    from: '',
    to: '',
  });

  constructor() {
    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const query = this.queryFromParamMap(params);
      this.filters.set({
        operatorId: query.operatorId ?? '',
        action: query.action ?? '',
        entityType: query.entityType ?? '',
        entityId: query.entityId ?? '',
        requestId: query.requestId ?? '',
        from: toDateInputValue(query.from),
        to: toDateInputValue(query.to),
      });
      this.load(query);
    });
  }

  queryFromRoute(): AuditLogQuery {
    return this.queryFromParamMap(this.#route.snapshot.queryParamMap);
  }

  queryFromParamMap(params: ParamMap): AuditLogQuery {
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 25);

    return {
      page: positiveNumberOrDefault(page, 1),
      limit: Math.min(positiveNumberOrDefault(limit, 25), 100),
      operatorId: params.get('operatorId') ?? undefined,
      action: params.get('action') ?? undefined,
      entityType: params.get('entityType') ?? undefined,
      entityId: params.get('entityId') ?? undefined,
      requestId: params.get('requestId') ?? undefined,
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
    };
  }

  applyFilters(): void {
    const filters = this.filters();
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({
        page: 1,
        limit: this.page()?.meta.limit ?? this.queryFromRoute().limit ?? 25,
        operatorId: filters.operatorId.trim(),
        action: filters.action.trim().toUpperCase(),
        entityType: filters.entityType.trim(),
        entityId: filters.entityId.trim(),
        requestId: filters.requestId.trim(),
        from: toIsoStart(filters.from),
        to: toIsoEnd(filters.to),
      }),
    });
  }

  updateFilter(
    name: 'operatorId' | 'action' | 'entityType' | 'entityId' | 'requestId' | 'from' | 'to',
    value: string,
  ): void {
    this.filters.set({ ...this.filters(), [name]: value });
  }

  clearFilters(): void {
    this.filters.set({
      operatorId: '',
      action: '',
      entityType: '',
      entityId: '',
      requestId: '',
      from: '',
      to: '',
    });
    this.applyFilters();
  }

  goToPage(page: number): void {
    const query = this.queryFromRoute();
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({ ...query, page }),
    });
  }

  detailQueryParams(): AuditLogQuery {
    return cleanQuery(this.queryFromRoute());
  }

  private load(query: AuditLogQuery): void {
    this.loading.set(true);
    this.error.set('');
    this.#audit.list(query).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.page.set(null);
        this.error.set('Audit records could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}

function positiveNumberOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
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

function cleanQuery(query: AuditLogQuery): AuditLogQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  ) as AuditLogQuery;
}
