import { AdminRole } from '@prisma/client';

export interface AdminOperatorRecord {
  id: bigint;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  activatedAt: Date | null;
}

export class AdminOperatorResponseDto {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  activatedAt: Date | null;

  constructor(operator: AdminOperatorRecord) {
    this.id = operator.id.toString();
    this.name = operator.name;
    this.email = operator.email;
    this.role = operator.role;
    this.active = operator.active;
    this.activatedAt = operator.activatedAt;
  }
}
