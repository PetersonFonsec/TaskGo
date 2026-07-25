import type { JsonDateTime } from '../auth-profile';

export const PROVIDER_PROFILE_COMPLETION_ITEM_IDS = [
  'BANK_ACCOUNT',
  'PHOTO',
  'SOCIAL_LINKS',
  'ADDRESS',
] as const;

export type ProviderProfileCompletionItemId =
  (typeof PROVIDER_PROFILE_COMPLETION_ITEM_IDS)[number];

export const PROVIDER_PROFILE_COMPLETION_ITEM_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETE',
  'ERROR',
] as const;

export type ProviderProfileCompletionItemStatus =
  (typeof PROVIDER_PROFILE_COMPLETION_ITEM_STATUSES)[number];

export interface ProviderProfileCompletionItem {
  readonly id: ProviderProfileCompletionItemId;
  readonly status: ProviderProfileCompletionItemStatus;
  readonly requiredForPayout: boolean;
}

export interface ProviderProfileCompletionProgress {
  readonly completed: number;
  readonly total: number;
}

export interface ProviderProfileCompletionResponse {
  readonly payoutReady: boolean;
  readonly allComplete: boolean;
  readonly required: ProviderProfileCompletionProgress;
  readonly recommended: ProviderProfileCompletionProgress;
  readonly items: readonly ProviderProfileCompletionItem[];
}

export type ProviderBankAccountHolderType = 'INDIVIDUAL' | 'COMPANY';
export type ProviderBankAccountType = 'CHECKING' | 'SAVINGS';

/**
 * Write-only financial input. Implementations must not persist or echo these
 * values after synchronizing them with the payout gateway.
 */
export interface ProviderBankAccountUpdateRequest {
  readonly holderName: string;
  readonly holderType: ProviderBankAccountHolderType;
  readonly holderDocument: string;
  readonly bankCode: string;
  readonly branchNumber: string;
  readonly branchCheckDigit?: string | null;
  readonly accountNumber: string;
  readonly accountCheckDigit: string;
  readonly accountType: ProviderBankAccountType;
}

export type ProviderPayoutSyncStatus =
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'READY'
  | 'REJECTED'
  | 'UNKNOWN';

export interface ProviderMaskedBankAccount {
  readonly bankName?: string | null;
  readonly bankCode?: string | null;
  readonly branchLastDigits?: string | null;
  readonly accountLastDigits?: string | null;
}

export interface ProviderPayoutStatusResponse {
  readonly syncStatus: ProviderPayoutSyncStatus;
  readonly payoutReady: boolean;
  readonly bankAccount: ProviderMaskedBankAccount | null;
  readonly updatedAt: JsonDateTime | null;
  readonly errorCode?: string | null;
}

export type ProviderPayoutMutationResponse = ProviderPayoutStatusResponse;

export interface ProviderSocialLinksUpdateRequest {
  readonly whatsapp?: string | null;
  readonly instagram?: string | null;
  readonly facebook?: string | null;
  readonly linkedin?: string | null;
}

export interface ProviderSocialLinksResponse {
  readonly whatsapp: string | null;
  readonly instagram: string | null;
  readonly facebook: string | null;
  readonly linkedin: string | null;
}
