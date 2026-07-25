export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'UNVERIFIED';

export const pagarmePayoutCapabilityEvidence = {
  api: {
    version: 'Core API v5',
    productionBaseUrl: 'https://api.pagar.me/core/v5',
    sandboxBaseUrl: 'https://sdx-api.pagar.me/core/v5',
    checkedAt: '2026-07-24',
  },
  capabilities: {
    recipientCreate: {
      status: 'SUPPORTED' as CapabilityStatus,
      method: 'POST',
      path: '/recipients',
      source: 'OFFICIAL_DOCUMENTATION',
    },
    recipientGet: {
      status: 'SUPPORTED' as CapabilityStatus,
      method: 'GET',
      path: '/recipients/{recipient_id}',
      source: 'OFFICIAL_DOCUMENTATION',
    },
    bankAccountCreate: {
      status: 'SUPPORTED' as CapabilityStatus,
      method: 'POST',
      path: '/recipients',
      source: 'OFFICIAL_DOCUMENTATION',
    },
    bankAccountUpdate: {
      status: 'SUPPORTED' as CapabilityStatus,
      method: 'PATCH',
      path: '/recipients/{recipient_id}/default-bank-account',
      source: 'OFFICIAL_DOCUMENTATION_REQUIRES_IP_ALLOWLIST',
    },
    payoutPixKey: {
      status: 'UNSUPPORTED' as CapabilityStatus,
      method: null,
      path: null,
      source: 'NO_PUBLIC_CORE_V5_ENDPOINT_DOCUMENTED',
    },
    mutationIdempotency: {
      status: 'UNVERIFIED' as CapabilityStatus,
      header: null,
      source: 'NO_PUBLIC_RECIPIENT_IDEMPOTENCY_CONTRACT_DOCUMENTED',
    },
  },
  sanitizedExchanges: {
    recipientAccepted: {
      kind: 'RECIPIENT',
      source: 'SYNTHETIC_CONTRACT',
      request: {
        code: 'taskgo-provider-example',
        register_information: {
          type: 'individual',
          document: '*******8901',
        },
        default_bank_account: {
          bank: '***',
          branch_number: '****',
          account_number: '*****',
        },
      },
      response: {
        id: 'rp_sanitized',
        status: 'active',
        default_bank_account: {
          id: 'ba_sanitized',
          status: 'active',
          branch_number: '****',
          account_number: '*****',
        },
      },
    },
    recipientRejected: {
      kind: 'RECIPIENT',
      source: 'SYNTHETIC_CONTRACT',
      response: {
        statusCode: 400,
        errors: [
          {
            code: 'invalid_register_information',
            message: 'Recipient data is invalid',
          },
        ],
      },
    },
    bankProcessing: {
      kind: 'BANK_ACCOUNT',
      source: 'SYNTHETIC_CONTRACT',
      response: {
        id: 'ba_sanitized',
        status: 'pending',
        branch_number: '****',
        account_number: '*****',
      },
    },
    payoutPixUnavailable: {
      kind: 'PAYOUT_PIX_KEY',
      source: 'DOCUMENTATION_GAP',
      response: {
        supported: false,
        reason: 'NO_PUBLIC_CORE_V5_ENDPOINT_DOCUMENTED',
      },
    },
    idempotentReplay: {
      kind: 'IDEMPOTENCY',
      source: 'GATEWAY_CONTRACT_UNDOCUMENTED',
      response: {
        verified: false,
        reason: 'TASKGO_IDEMPOTENCY_REQUIRED',
      },
    },
    conflictingReplay: {
      kind: 'IDEMPOTENCY_CONFLICT',
      source: 'GATEWAY_CONTRACT_UNDOCUMENTED',
      response: {
        verified: false,
        reason: 'TASKGO_IDEMPOTENCY_REQUIRED',
      },
    },
  },
} as const;
