export type JsonId = string;
export type JsonDateTime = string;

export type TaskGoUserRole = 'CUSTOMER' | 'PROVIDER';
export type TaskGoApiUserType = 'CLIENTE' | 'PRESTADOR';
export type TaskGoAdminRole = 'ADMINISTRATOR' | 'SUPPORT' | 'FINANCE' | 'MODERATOR';

export interface AuthLoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface PublicAddressSummary {
  readonly id?: JsonId;
  readonly label?: string;
  readonly street: string;
  readonly number?: string;
  readonly complement?: string | null;
  readonly neighborhood?: string;
  readonly city: string;
  readonly state: string;
  readonly country?: string;
  readonly cep?: string;
  readonly postalCode?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly placeId?: string | null;
  readonly isDefault?: boolean;
  readonly isPrimary?: boolean;
}

export interface PublicUserProfile {
  readonly id: JsonId;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly cpf: string;
  readonly type: TaskGoUserRole | TaskGoApiUserType;
  readonly photoUrl?: string | null;
  readonly bio?: string | null;
  readonly emailVerified?: boolean;
  readonly phoneVerified?: boolean;
  readonly pendingEmail?: string | null;
  readonly pendingPhone?: string | null;
  readonly createdAt?: JsonDateTime;
  readonly updatedAt?: JsonDateTime;
  readonly addresses?: readonly PublicAddressSummary[];
}

export interface CustomerAuthSession {
  readonly access_token: string;
  readonly user: PublicUserProfile;
}

export interface AdminOperatorProfile {
  readonly id: JsonId;
  readonly name: string;
  readonly email: string;
  readonly role: TaskGoAdminRole;
  readonly active: boolean;
  readonly activatedAt: JsonDateTime | null;
}

export interface AdminAuthSession {
  readonly access_token: string;
  readonly operator: AdminOperatorProfile;
}

export interface AdminMeResponse {
  readonly operator: AdminOperatorProfile;
}

export interface UserRegistrationAddressRequest {
  readonly label: string;
  readonly street: string;
  readonly number?: string;
  readonly complement?: string | null;
  readonly neighborhood?: string;
  readonly city: string;
  readonly state: string;
  readonly country?: string;
  readonly cep: string;
  readonly lat?: number;
  readonly lng?: number;
}

export interface UserRegistrationSocialRequest {
  readonly whatsapp?: string;
  readonly instagram?: string;
  readonly facebook?: string;
  readonly linkdin?: string;
  readonly linkedin?: string;
}

export interface UserRegistrationRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly phone: string;
  readonly cpf: string;
  readonly type: TaskGoUserRole | TaskGoApiUserType;
  readonly address?: UserRegistrationAddressRequest;
  readonly social?: UserRegistrationSocialRequest;
  readonly services?: readonly JsonId[];
}

export interface UserProfileUpdateRequest {
  readonly name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly photoUrl?: string | null;
  readonly bio?: string | null;
}
