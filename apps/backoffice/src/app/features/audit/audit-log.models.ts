import { AdminRole } from '@app/core/auth/admin-session.model';

export interface AuditLogQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly operatorId?: string;
  readonly action?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly requestId?: string;
  readonly from?: string;
  readonly to?: string;
}

export interface AuditLogPage<T> {
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

export interface AuditLogActor {
  readonly id: string;
  readonly role: AdminRole;
  readonly name: string;
  readonly email: string;
  readonly active: boolean;
}

export interface AuditLogTarget {
  readonly type: string;
  readonly id: string;
}

export interface AuditLogListItem {
  readonly id: string;
  readonly action: string;
  readonly target: AuditLogTarget;
  readonly actor: AuditLogActor;
  readonly reason: string | null;
  readonly requestId: string;
  readonly createdAt: string;
}

export interface AuditLogDetail extends AuditLogListItem {
  readonly before: unknown;
  readonly after: unknown;
  readonly context: {
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
  };
}

export interface AuditLogDetailResponse {
  readonly auditLog: AuditLogDetail;
}

export interface AuditDeltaEntry {
  readonly path: string;
  readonly value: string;
}

const SECRET_KEY_PATTERN =
  /(password|senha|token|secret|authorization|cookie|api[-_]?key|credential)/i;

export function safeAuditDeltaEntries(value: unknown): readonly AuditDeltaEntry[] {
  return flattenAuditDelta(value, '');
}

function flattenAuditDelta(value: unknown, path: string): readonly AuditDeltaEntry[] {
  if (value === undefined || value === null) {
    return path ? [{ path, value: value === null ? 'null' : '' }] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0 && path) return [{ path, value: '[]' }];

    return value.flatMap((item, index) => flattenAuditDelta(item, `${path}[${index}]`));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !SECRET_KEY_PATTERN.test(key),
    );

    if (entries.length === 0 && path) return [{ path, value: '{}' }];

    return entries.flatMap(([key, item]) =>
      flattenAuditDelta(item, path ? `${path}.${key}` : key),
    );
  }

  return path ? [{ path, value: String(value) }] : [];
}
