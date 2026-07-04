import { AdminRole } from '@app/core/auth/admin-session.model';

export interface OperatorPageQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly role?: AdminRole;
  readonly active?: boolean;
  readonly search?: string;
}

export interface OperatorPage<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
    readonly hasPrevPage?: boolean;
    readonly hasNextPage?: boolean;
  };
}

export interface AdminOperatorRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly active: boolean;
  readonly activatedAt: string | null;
}

export interface OperatorMutationResponse {
  readonly operator: AdminOperatorRecord;
}

export interface InviteOperatorRequest {
  readonly name: string;
  readonly email: string;
  readonly role: AdminRole;
}

export interface InviteOperatorResponse extends OperatorMutationResponse {
  readonly invitation: {
    readonly expiresAt: string;
    readonly deliveryStatus: 'SENT' | 'FAILED';
  };
}

export interface OperatorRoleOption {
  readonly value: AdminRole;
  readonly label: string;
  readonly description: string;
}

export const OPERATOR_ROLE_OPTIONS: readonly OperatorRoleOption[] = [
  {
    value: 'ADMINISTRATOR',
    label: 'Administrator',
    description: 'Full governance, operator management, provider decisions, and audit access.'
  },
  {
    value: 'SUPPORT',
    label: 'Support',
    description: 'Provider queue, details, and support consultation workflows.'
  },
  {
    value: 'FINANCE',
    label: 'Finance',
    description: 'Financial workflows as those capabilities are released.'
  },
  {
    value: 'MODERATOR',
    label: 'Moderator',
    description: 'Service, category, and review moderation workflows.'
  }
];

export function roleLabel(role: AdminRole): string {
  return OPERATOR_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
