export type AdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

export interface AdminOperator {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly active: boolean;
  readonly activatedAt: string | null;
}

export interface AdminLoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface AdminLoginResponse {
  readonly access_token: string;
  readonly operator: AdminOperator;
}

export interface AdminMeResponse {
  readonly operator: AdminOperator;
}

export interface AdminSession {
  readonly token: string;
  readonly operator: AdminOperator;
}

export interface AdminTokenPayload {
  readonly sub?: string;
  readonly tokenKind?: string;
  readonly role?: string;
  readonly ver?: number;
  readonly exp?: number;
}
