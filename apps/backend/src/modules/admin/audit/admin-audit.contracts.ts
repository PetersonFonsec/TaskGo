import { AdminRole } from '@prisma/client';

import { AdminActor } from '../auth/admin-actor';

export enum AdminAuditAction {
  AdminUserInvited = 'ADMIN_USER_INVITED',
  AdminUserActivated = 'ADMIN_USER_ACTIVATED',
  AdminUserDeactivated = 'ADMIN_USER_DEACTIVATED',
  AdminUserPasswordChanged = 'ADMIN_USER_PASSWORD_CHANGED',
  AdminUserRoleChanged = 'ADMIN_USER_ROLE_CHANGED',
  ProviderApproved = 'PROVIDER_APPROVED',
  ProviderRejected = 'PROVIDER_REJECTED',
  ProviderBlocked = 'PROVIDER_BLOCKED',
  ProviderUnblocked = 'PROVIDER_UNBLOCKED',
}

export interface AdminAuditTarget {
  type: string;
  id: string | bigint | number;
}

export interface AdminAuditRequestContext {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditAppendInput {
  actor: AdminActor;
  action: AdminAuditAction | string;
  target: AdminAuditTarget;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string | null;
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditActorSnapshot {
  id: bigint;
  role: AdminRole;
}
