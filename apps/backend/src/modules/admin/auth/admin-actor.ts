import { AdminRole, AdminUser } from '@prisma/client';
import { Request } from 'express';

export const ADMIN_ACTOR_KEY = 'adminActor';
export const ADMIN_OPERATOR_KEY = 'adminOperator';

export interface AdminActor {
  id: bigint;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  tokenVersion: number;
  activatedAt: Date | null;
}

export type AdminRequest = Request & {
  [ADMIN_ACTOR_KEY]?: AdminActor;
  [ADMIN_OPERATOR_KEY]?: AdminActor;
};

export function toAdminActor(operator: AdminUser): AdminActor {
  return {
    id: operator.id,
    name: operator.name,
    email: operator.email,
    role: operator.role,
    active: operator.active,
    tokenVersion: operator.tokenVersion,
    activatedAt: operator.activatedAt,
  };
}
