import { AdminRole } from '@prisma/client';
import type { AdminOperatorProfile } from '@taskgo/shared';

export interface AdminOperatorRecord {
  id: bigint;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  activatedAt: Date | null;
}

export class AdminOperatorResponseDto implements AdminOperatorProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  activatedAt: string | null;

  constructor(operator: AdminOperatorRecord) {
    this.id = operator.id.toString();
    this.name = operator.name;
    this.email = operator.email;
    this.role = operator.role;
    this.active = operator.active;
    this.activatedAt = operator.activatedAt?.toISOString() ?? null;
  }
}
