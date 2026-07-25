export type TaskGoSyncCategory =
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'READY'
  | 'REJECTED'
  | 'UNKNOWN';
export type TaskGoGatewayError =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'CONFLICT'
  | 'TRANSIENT'
  | 'UNKNOWN';

const sensitiveKey =
  /(authorization|secret|password|cpf|cnpj|document|account_number|branch_number|pix_?key)/i;
const maskedValue = /^[*•xX.-]+[a-zA-Z0-9]{0,4}$/;

export function assertSanitized(value: unknown, path = 'fixture'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSanitized(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (
      sensitiveKey.test(key) &&
      typeof child === 'string' &&
      child.length > 0 &&
      !maskedValue.test(child)
    ) {
      throw new Error(`Sensitive value is not sanitized at ${childPath}`);
    }
    assertSanitized(child, childPath);
  }
}

export function mapRecipientState(input: {
  recipientId?: string | null;
  status?: string | null;
  bankStatus?: string | null;
}): TaskGoSyncCategory {
  if (!input.recipientId) return 'NOT_CONFIGURED';
  const states = [input.status, input.bankStatus]
    .filter(Boolean)
    .map((state) => state!.toLowerCase());
  if (
    states.some((state) =>
      ['failed', 'rejected', 'blocked', 'inactive'].includes(state),
    )
  )
    return 'REJECTED';
  if (
    states.some((state) =>
      ['pending', 'processing', 'registration'].includes(state),
    )
  )
    return 'PENDING';
  if (
    states.length > 0 &&
    states.every((state) => ['active', 'approved', 'ready'].includes(state))
  )
    return 'READY';
  return 'UNKNOWN';
}

export function mapGatewayError(statusCode: number): TaskGoGatewayError {
  if ([400, 422].includes(statusCode)) return 'VALIDATION';
  if ([401, 403].includes(statusCode)) return 'AUTHENTICATION';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 429 || statusCode >= 500) return 'TRANSIENT';
  return 'UNKNOWN';
}

export function sandboxSkipReason(env: NodeJS.ProcessEnv): string | null {
  if (env.PAGARME_CAPABILITY_SANDBOX !== 'true')
    return 'PAGARME_CAPABILITY_SANDBOX is not enabled';
  if (!env.PAGARME_BASE_URL?.includes('sdx-api.pagar.me/core/v5'))
    return 'PAGARME_BASE_URL is not the Core v5 sandbox';
  if (!env.PAGARME_SECRET_KEY?.startsWith('sk_test_'))
    return 'PAGARME_SECRET_KEY is not a sandbox credential';
  if (!env.PAGARME_CAPABILITY_RECIPIENT_ID)
    return 'PAGARME_CAPABILITY_RECIPIENT_ID is not configured';
  return null;
}

export function sandboxMutationSkipReason(
  env: NodeJS.ProcessEnv,
): string | null {
  if (env.PAGARME_CAPABILITY_SANDBOX !== 'true')
    return 'PAGARME_CAPABILITY_SANDBOX is not enabled';
  if (!env.PAGARME_BASE_URL?.includes('sdx-api.pagar.me/core/v5'))
    return 'PAGARME_BASE_URL is not the Core v5 sandbox';
  if (!env.PAGARME_SECRET_KEY?.startsWith('sk_test_'))
    return 'PAGARME_SECRET_KEY is not a sandbox credential';
  if (!env.PAGARME_CAPABILITY_RECIPIENT_PAYLOAD)
    return 'PAGARME_CAPABILITY_RECIPIENT_PAYLOAD is not configured';
  if (!env.PAGARME_CAPABILITY_BANK_PAYLOAD)
    return 'PAGARME_CAPABILITY_BANK_PAYLOAD is not configured';
  if (!env.PAGARME_CAPABILITY_IDEMPOTENCY_KEY)
    return 'PAGARME_CAPABILITY_IDEMPOTENCY_KEY is not configured';
  return null;
}
