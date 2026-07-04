import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';

import {
  availableProviderActions,
  PROVIDER_ACTIONS,
  ProviderActionView,
  ProviderDecision,
  ProviderDecisionAction,
  ProviderDetails,
  ProviderPage,
  ProviderStatus
} from './provider-admin.models';
import { ProviderAdminService } from './provider-admin.service';

interface DecisionDialogState {
  readonly action: ProviderActionView;
  readonly reason: string;
  readonly validation: string;
}

@Component({
  selector: 'bo-provider-details-page',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './provider-details.page.html',
  styleUrl: './providers.scss'
})
export class ProviderDetailsPage {
  readonly #route = inject(ActivatedRoute);
  readonly #providers = inject(ProviderAdminService);
  readonly #auth = inject(AdminAuthService);
  readonly #destroyRef = inject(DestroyRef);

  @ViewChild('dialogTitle') private readonly dialogTitle?: ElementRef<HTMLElement>;

  readonly provider = signal<ProviderDetails | null>(null);
  readonly history = signal<ProviderPage<ProviderDecision> | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly announcement = signal('');
  readonly conflict = signal('');
  readonly dialog = signal<DecisionDialogState | null>(null);

  readonly operator = this.#auth.operator;

  constructor() {
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  actions(): readonly ProviderActionView[] {
    return availableProviderActions(this.operator()?.role, this.provider()?.status.current);
  }

  openDecision(action: ProviderDecisionAction): void {
    const provider = this.provider();
    const actionView = PROVIDER_ACTIONS[action];
    if (!provider || !this.actions().some((available) => available.action === action)) return;

    this.dialog.set({ action: actionView, reason: '', validation: '' });
    setTimeout(() => this.dialogTitle?.nativeElement.focus());
  }

  updateReason(reason: string): void {
    const dialog = this.dialog();
    if (!dialog) return;
    this.dialog.set({ ...dialog, reason, validation: '' });
  }

  closeDialog(): void {
    this.dialog.set(null);
  }

  submitDecision(): void {
    const provider = this.provider();
    const dialog = this.dialog();
    if (!provider || !dialog || this.submitting()) return;

    const reason = dialog.reason.trim();
    if (dialog.action.requiresReason && !reason) {
      this.dialog.set({
        ...dialog,
        validation: `${dialog.action.label} requires an operational reason.`
      });
      return;
    }

    this.submitting.set(true);
    this.conflict.set('');
    this.announcement.set('');

    const command = this.commandFor(dialog.action.action, provider.id, reason);
    command.subscribe({
      next: () => {
        this.submitting.set(false);
        this.dialog.set(null);
        this.announcement.set(`${dialog.action.label} completed for ${provider.identity.name}.`);
        this.load(provider.id, false);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.dialog.set(null);
          this.conflict.set('Provider status changed before this decision. The record was refreshed.');
          this.load(provider.id, false);
          return;
        }

        this.dialog.set({
          ...dialog,
          validation: decisionErrorMessage(error)
        });
      }
    });
  }

  statusLabel(status: ProviderStatus): string {
    return statusLabels[status];
  }

  statusIcon(status: ProviderStatus): string {
    return statusIcons[status];
  }

  decisionLabel(action: ProviderDecisionAction): string {
    return PROVIDER_ACTIONS[action].label;
  }

  private load(id: string, showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.error.set('');

    forkJoin({
      details: this.#providers.get(id),
      history: this.#providers.history(id, { page: 1, limit: 100 })
    }).subscribe({
      next: ({ details, history }) => {
        this.provider.set(details.provider);
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.provider.set(null);
        this.history.set(null);
        this.error.set('Provider review record could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private commandFor(action: ProviderDecisionAction, id: string, reason: string) {
    if (action === 'APPROVE') return this.#providers.approve(id);
    if (action === 'REJECT') return this.#providers.reject(id, reason);
    if (action === 'BLOCK') return this.#providers.block(id, reason);
    return this.#providers.unblock(id, reason);
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

function decisionErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 422) {
    return 'Enter an operational reason before submitting this decision.';
  }

  return 'The provider decision could not be completed.';
}

