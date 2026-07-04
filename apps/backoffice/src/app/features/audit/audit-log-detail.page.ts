import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuditDeltaEntry, AuditLogDetail, safeAuditDeltaEntries } from './audit-log.models';
import { AuditLogService } from './audit-log.service';

@Component({
  selector: 'bo-audit-log-detail-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './audit-log-detail.page.html',
  styleUrl: './audit-log.scss',
})
export class AuditLogDetailPage {
  readonly #route = inject(ActivatedRoute);
  readonly #audit = inject(AuditLogService);
  readonly #destroyRef = inject(DestroyRef);

  readonly event = signal<AuditLogDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly returnQueryParams = computed(() => this.#route.snapshot.queryParams);
  readonly beforeEntries = computed(() => safeAuditDeltaEntries(this.event()?.before));
  readonly afterEntries = computed(() => safeAuditDeltaEntries(this.event()?.after));

  constructor() {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.event.set(null);
        this.error.set('Audit record was not found.');
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  trackEntry(_index: number, entry: AuditDeltaEntry): string {
    return entry.path;
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.#audit.get(id).subscribe({
      next: ({ auditLog }) => {
        this.event.set(auditLog);
        this.loading.set(false);
      },
      error: () => {
        this.event.set(null);
        this.error.set('Audit record details could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}
