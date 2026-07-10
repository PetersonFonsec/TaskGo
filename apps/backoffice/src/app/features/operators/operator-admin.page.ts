import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import type { TaskGoAdminRole } from '@taskgo/shared';

import {
  AdminOperatorRecord,
  InviteOperatorRequest,
  OPERATOR_ROLE_OPTIONS,
  OperatorPage,
  OperatorPageQuery,
  roleLabel
} from './operator-admin.models';
import { OperatorAdminService } from './operator-admin.service';

type OperatorCommand = 'ROLE' | 'ACTIVATE' | 'DEACTIVATE' | 'RESEND';

interface ConfirmationState {
  readonly command: OperatorCommand;
  readonly operator: AdminOperatorRecord;
  readonly nextRole?: TaskGoAdminRole;
  readonly title: string;
  readonly consequence: string;
}

@Component({
  selector: 'bo-operator-admin-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './operator-admin.page.html',
  styleUrl: './operator-admin.page.scss'
})
export class OperatorAdminPage {
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #operators = inject(OperatorAdminService);
  readonly #destroyRef = inject(DestroyRef);

  @ViewChild('dialogTitle') private readonly dialogTitle?: ElementRef<HTMLElement>;

  readonly roles = OPERATOR_ROLE_OPTIONS;
  readonly page = signal<OperatorPage<AdminOperatorRecord> | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly conflict = signal('');
  readonly announcement = signal('');
  readonly formError = signal('');
  readonly filters = signal({ search: '', role: '', active: '' });
  readonly inviteForm = signal<InviteOperatorRequest>({
    name: '',
    email: '',
    role: 'SUPPORT'
  });
  readonly pendingRole = signal<Record<string, TaskGoAdminRole>>({});
  readonly confirmation = signal<ConfirmationState | null>(null);

  constructor() {
    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      const query = this.queryFromParamMap(params);
      this.filters.set({
        search: query.search ?? '',
        role: query.role ?? '',
        active: query.active === undefined ? '' : String(query.active)
      });
      this.load(query);
    });
  }

  queryFromRoute(): OperatorPageQuery {
    return this.queryFromParamMap(this.#route.snapshot.queryParamMap);
  }

  queryFromParamMap(params: ParamMap): OperatorPageQuery {
    const page = Number(params.get('page') ?? 1);
    const limit = Number(params.get('limit') ?? 25);
    const role = params.get('role');
    const active = params.get('active');

    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
      search: params.get('search') ?? undefined,
      role: isAdminRole(role) ? role : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined
    };
  }

  applyFilters(): void {
    const filters = this.filters();
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({
        page: 1,
        limit: this.page()?.meta.limit ?? this.queryFromRoute().limit ?? 25,
        search: filters.search.trim() || undefined,
        role: isAdminRole(filters.role) ? filters.role : undefined,
        active: filters.active === 'true' ? true : filters.active === 'false' ? false : undefined
      })
    });
  }

  updateFilter(name: 'search' | 'role' | 'active', value: string): void {
    this.filters.set({ ...this.filters(), [name]: value });
  }

  clearFilters(): void {
    this.filters.set({ search: '', role: '', active: '' });
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: cleanQuery({ ...this.queryFromRoute(), page })
    });
  }

  updateInviteField(name: keyof InviteOperatorRequest, value: string): void {
    this.inviteForm.set({
      ...this.inviteForm(),
      [name]: name === 'role' && isAdminRole(value) ? value : value
    });
    this.formError.set('');
  }

  submitInvitation(): void {
    const request = {
      name: this.inviteForm().name.trim(),
      email: this.inviteForm().email.trim(),
      role: this.inviteForm().role
    };

    if (!request.name || !request.email || !isAdminRole(request.role)) {
      this.formError.set('Enter the operator name, email, and one fixed role.');
      return;
    }

    this.submitting.set(true);
    this.formError.set('');
    this.announcement.set('');
    this.#operators.invite(request).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.inviteForm.set({ name: '', email: '', role: 'SUPPORT' });
        this.announcement.set(
          response.invitation.deliveryStatus === 'SENT'
            ? `Invitation sent to ${response.operator.email}.`
            : `Invitation was rotated for ${response.operator.email}, but delivery failed.`
        );
        this.reload();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(operatorErrorMessage(error, 'Invitation could not be sent.'));
      }
    });
  }

  selectedRole(operator: AdminOperatorRecord): TaskGoAdminRole {
    return this.pendingRole()[operator.id] ?? operator.role;
  }

  updateSelectedRole(operator: AdminOperatorRecord, value: string): void {
    if (!isAdminRole(value)) return;
    this.pendingRole.set({ ...this.pendingRole(), [operator.id]: value });
  }

  openRoleChange(operator: AdminOperatorRecord): void {
    const nextRole = this.selectedRole(operator);
    if (nextRole === operator.role) return;

    this.openConfirmation({
      command: 'ROLE',
      operator,
      nextRole,
      title: `Change ${operator.name}'s role`,
      consequence: `${operator.name}'s old Backoffice sessions are invalidated immediately.`
    });
  }

  openActivation(operator: AdminOperatorRecord): void {
    this.openConfirmation({
      command: 'ACTIVATE',
      operator,
      title: `Activate ${operator.name}`,
      consequence: `${operator.name} regains Backoffice access. Existing sessions are invalidated.`
    });
  }

  openDeactivation(operator: AdminOperatorRecord): void {
    this.openConfirmation({
      command: 'DEACTIVATE',
      operator,
      title: `Deactivate ${operator.name}`,
      consequence: `${operator.name} loses Backoffice access immediately and existing sessions stop working.`
    });
  }

  openResend(operator: AdminOperatorRecord): void {
    this.openConfirmation({
      command: 'RESEND',
      operator,
      title: `Resend invitation to ${operator.name}`,
      consequence: `The previous unused invitation for ${operator.email} is replaced.`
    });
  }

  closeConfirmation(): void {
    this.confirmation.set(null);
  }

  confirmCommand(): void {
    const confirmation = this.confirmation();
    if (!confirmation || this.submitting()) return;

    this.submitting.set(true);
    this.conflict.set('');
    this.announcement.set('');

    const request = this.requestFor(confirmation);
    request.subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmation.set(null);
        this.announcement.set(successMessage(confirmation));
        this.reload();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.confirmation.set(null);

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflict.set(
            `${confirmation.operator.name} changed before this action could finish. The list was refreshed without applying a local optimistic change.`
          );
          this.reload();
          return;
        }

        this.error.set(operatorErrorMessage(error, 'Operator action could not be completed.'));
      }
    });
  }

  roleLabel(role: TaskGoAdminRole): string {
    return roleLabel(role);
  }

  private openConfirmation(state: ConfirmationState): void {
    this.confirmation.set(state);
    setTimeout(() => this.dialogTitle?.nativeElement.focus());
  }

  private requestFor(confirmation: ConfirmationState) {
    if (confirmation.command === 'ROLE' && confirmation.nextRole) {
      return this.#operators.changeRole(confirmation.operator.id, confirmation.nextRole);
    }
    if (confirmation.command === 'ACTIVATE') return this.#operators.activate(confirmation.operator.id);
    if (confirmation.command === 'DEACTIVATE') {
      return this.#operators.deactivate(confirmation.operator.id);
    }
    return this.#operators.invite({
      name: confirmation.operator.name,
      email: confirmation.operator.email,
      role: confirmation.operator.role
    });
  }

  private reload(): void {
    this.load(this.queryFromRoute(), false);
  }

  private load(query: OperatorPageQuery, showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.error.set('');

    this.#operators.list(query).subscribe({
      next: (page) => {
        this.page.set(page);
        this.pendingRole.set(
          Object.fromEntries(page.data.map((operator) => [operator.id, operator.role]))
        );
        this.loading.set(false);
      },
      error: () => {
        this.page.set(null);
        this.loading.set(false);
        this.error.set('Operator list could not be loaded.');
      }
    });
  }
}

function isAdminRole(value: string | null): value is TaskGoAdminRole {
  return OPERATOR_ROLE_OPTIONS.some((option) => option.value === value);
}

function cleanQuery(query: OperatorPageQuery): OperatorPageQuery {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  ) as OperatorPageQuery;
}

function successMessage(confirmation: ConfirmationState): string {
  if (confirmation.command === 'ROLE' && confirmation.nextRole) {
    return `${confirmation.operator.name} is now ${roleLabel(confirmation.nextRole)}. Old sessions were invalidated.`;
  }
  if (confirmation.command === 'ACTIVATE') {
    return `${confirmation.operator.name} was activated.`;
  }
  if (confirmation.command === 'DEACTIVATE') {
    return `${confirmation.operator.name} was deactivated and old sessions were invalidated.`;
  }
  return `Invitation resent to ${confirmation.operator.email}.`;
}

function operatorErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;

  const message = extractMessage(error.error);
  return message || fallback;
}

function extractMessage(errorBody: unknown): string {
  if (typeof errorBody === 'string') return errorBody;
  if (typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody) {
    const message = (errorBody as { message: unknown }).message;
    return Array.isArray(message) ? message.join(' ') : String(message);
  }
  return '';
}
