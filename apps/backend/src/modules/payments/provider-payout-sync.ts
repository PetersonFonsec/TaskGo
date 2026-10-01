import {
  ProviderBankAccountStatus,
  ProviderPayoutProfile,
  ProviderPayoutSyncStatus,
} from '@prisma/client';
import type { ProviderPayoutStatusResponse } from '@taskgo/shared';

import { mapRecipientState } from './pagarme-payout-capabilities.contract';
import type { RecipientResult } from './pagarme.service';

/** Non-final gateway states are re-read at most once per interval. */
export const PAYOUT_REFRESH_INTERVAL_MS = 60_000;
/** A claimed synchronization older than this is considered abandoned. */
export const PAYOUT_SYNC_LOCK_MS = 60_000;
/** Marks a synchronization in flight; exposed to the provider as such. */
export const PAYOUT_SYNCING_CODE = 'SYNCING';

const bankStatusBySync: Record<
  ProviderPayoutSyncStatus,
  ProviderBankAccountStatus
> = {
  READY: ProviderBankAccountStatus.CONFIRMED,
  PENDING: ProviderBankAccountStatus.PROCESSING,
  REJECTED: ProviderBankAccountStatus.ERROR,
  UNKNOWN: ProviderBankAccountStatus.UNCONFIRMED,
  NOT_CONFIGURED: ProviderBankAccountStatus.UNCONFIRMED,
};

export function recipientProfileState(result: RecipientResult) {
  const syncStatus = mapRecipientState(result) as ProviderPayoutSyncStatus;
  return {
    syncStatus,
    bankAccountStatus: bankStatusBySync[syncStatus],
    lastErrorCode: syncStatus === 'REJECTED' ? 'REJECTED' : null,
  };
}

export function isPayoutReady(
  profile: Pick<
    ProviderPayoutProfile,
    'pagarmeRecipientId' | 'syncStatus' | 'bankAccountStatus'
  >,
): boolean {
  return (
    !!profile.pagarmeRecipientId &&
    profile.syncStatus === ProviderPayoutSyncStatus.READY &&
    profile.bankAccountStatus === ProviderBankAccountStatus.CONFIRMED
  );
}

/** Never returns raw documents, branch or account numbers. */
export function toProviderPayoutResponse(
  profile: ProviderPayoutProfile | null,
): ProviderPayoutStatusResponse {
  if (!profile)
    return {
      syncStatus: 'NOT_CONFIGURED',
      payoutReady: false,
      bankAccount: null,
      updatedAt: null,
      errorCode: null,
    };
  const hasBankAccount = !!(profile.bankCode || profile.accountLastDigits);
  return {
    syncStatus: profile.pagarmeRecipientId
      ? profile.syncStatus
      : ProviderPayoutSyncStatus.NOT_CONFIGURED,
    payoutReady: isPayoutReady(profile),
    bankAccount: hasBankAccount
      ? {
          bankName: profile.bankName,
          bankCode: profile.bankCode,
          branchLastDigits: profile.branchLastDigits,
          accountLastDigits: profile.accountLastDigits,
        }
      : null,
    updatedAt: profile.updatedAt.toISOString(),
    errorCode:
      profile.lastErrorCode === PAYOUT_SYNCING_CODE &&
      profile.updatedAt.getTime() < Date.now() - PAYOUT_SYNC_LOCK_MS
        ? 'TRANSIENT'
        : profile.lastErrorCode,
  };
}

/** Keeps at most `size` trailing characters, hiding at least two when possible. */
export function lastDigits(value: string, size: number): string {
  return value.slice(-Math.min(size, Math.max(1, value.length - 2)));
}

export function isValidCnpj(value: string): boolean {
  const cnpj = value.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const checkDigit = (length: 12 | 13) => {
    const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(13 - length);
    const sum = weights.reduce(
      (total, weight, index) => total + Number(cnpj[index]) * weight,
      0,
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    checkDigit(12) === Number(cnpj[12]) && checkDigit(13) === Number(cnpj[13])
  );
}

/** Splits a Brazilian phone (+55DDNNNNNNNNN) into the gateway shape. */
export function splitBrazilianPhone(
  phone: string | null | undefined,
): { ddd: string; number: string } | null {
  let phoneDigits = (phone ?? '').replace(/\D/g, '');
  if (phoneDigits.length >= 12 && phoneDigits.startsWith('55'))
    phoneDigits = phoneDigits.slice(2);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) return null;
  return { ddd: phoneDigits.slice(0, 2), number: phoneDigits.slice(2) };
}
