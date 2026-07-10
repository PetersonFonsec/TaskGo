import type { AdminOperatorProfile } from '@taskgo/shared';

// Local storage shape: token payload internals stay out of shared public contracts.
export interface AdminSession {
  readonly token: string;
  readonly operator: AdminOperatorProfile;
}

export interface AdminTokenPayload {
  readonly sub?: string;
  readonly tokenKind?: string;
  readonly role?: string;
  readonly ver?: number;
  readonly exp?: number;
}
