import { UserType } from '@prisma/client';

export type CustomerRole = 'CLIENTE' | 'PRESTADOR';

export interface AuthenticatedIdentity {
  readonly id: string;
  readonly role: CustomerRole;
  /** Família do refresh token (sessão do app); ausente em tokens do site. */
  readonly sessionId?: string;
}

export const CUSTOMER_ROLES = new Set<CustomerRole>([
  UserType.CLIENTE,
  UserType.PRESTADOR,
]);

export function isCustomerRole(value: unknown): value is CustomerRole {
  return CUSTOMER_ROLES.has(value as CustomerRole);
}
