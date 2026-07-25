import { pagarmePayoutCapabilityEvidence } from '../../../test/fixtures/pagarme-payout-capabilities.fixture';
import {
  assertSanitized,
  mapGatewayError,
  mapRecipientState,
  sandboxMutationSkipReason,
  sandboxSkipReason,
} from './pagarme-payout-capabilities.contract';

describe('Pagar.me payout capability contract evidence', () => {
  it('records the Core v5 recipient and bank routes separately from payout Pix', () => {
    expect(
      pagarmePayoutCapabilityEvidence.capabilities.recipientCreate,
    ).toMatchObject({
      status: 'SUPPORTED',
      path: '/recipients',
    });
    expect(
      pagarmePayoutCapabilityEvidence.capabilities.bankAccountUpdate,
    ).toMatchObject({
      status: 'SUPPORTED',
      path: '/recipients/{recipient_id}/default-bank-account',
    });
    expect(
      pagarmePayoutCapabilityEvidence.capabilities.payoutPixKey,
    ).toMatchObject({
      status: 'UNSUPPORTED',
      path: null,
    });
    expect(
      pagarmePayoutCapabilityEvidence.sanitizedExchanges.payoutPixUnavailable
        .kind,
    ).toBe('PAYOUT_PIX_KEY');
    expect(JSON.stringify(pagarmePayoutCapabilityEvidence)).not.toContain(
      '"kind":"PIX_CHARGE"',
    );
  });

  it('accepts the complete sanitized deterministic evidence set', () => {
    expect(() =>
      assertSanitized(pagarmePayoutCapabilityEvidence),
    ).not.toThrow();
  });

  it.each([
    ['document', 'UNMASKED_DOCUMENT_VALUE'],
    ['account_number', 'UNMASKED_ACCOUNT_VALUE'],
    ['branch_number', 'UNMASKED_BRANCH_VALUE'],
    ['pixKey', 'UNMASKED_PIX_VALUE'],
    ['Authorization', 'UNMASKED_AUTH_VALUE'],
    ['secret_key', 'UNMASKED_SECRET_VALUE'],
  ])('rejects an unmasked %s value', (key, value) => {
    expect(() => assertSanitized({ [key]: value })).toThrow(
      `Sensitive value is not sanitized at fixture.${key}`,
    );
  });

  it.each([
    [{}, 'NOT_CONFIGURED'],
    [{ recipientId: 'rp_1', status: 'pending' }, 'PENDING'],
    [
      { recipientId: 'rp_1', status: 'active', bankStatus: 'approved' },
      'READY',
    ],
    [
      { recipientId: 'rp_1', status: 'active', bankStatus: 'rejected' },
      'REJECTED',
    ],
    [{ recipientId: 'rp_1', status: 'unexpected' }, 'UNKNOWN'],
  ] as const)('maps recipient evidence %p to %s', (input, expected) => {
    expect(mapRecipientState(input)).toBe(expected);
  });

  it.each([
    [400, 'VALIDATION'],
    [422, 'VALIDATION'],
    [401, 'AUTHENTICATION'],
    [403, 'AUTHENTICATION'],
    [409, 'CONFLICT'],
    [429, 'TRANSIENT'],
    [503, 'TRANSIENT'],
    [404, 'UNKNOWN'],
  ] as const)('maps HTTP %d to the safe %s category', (status, expected) => {
    expect(mapGatewayError(status)).toBe(expected);
  });

  it('records undocumented gateway idempotency as a TaskGo-owned requirement', () => {
    expect(
      pagarmePayoutCapabilityEvidence.capabilities.mutationIdempotency.status,
    ).toBe('UNVERIFIED');
    expect(
      pagarmePayoutCapabilityEvidence.sanitizedExchanges.idempotentReplay,
    ).toMatchObject({
      source: 'GATEWAY_CONTRACT_UNDOCUMENTED',
      response: { reason: 'TASKGO_IDEMPOTENCY_REQUIRED' },
    });
    expect(
      pagarmePayoutCapabilityEvidence.sanitizedExchanges.conflictingReplay,
    ).toMatchObject({
      source: 'GATEWAY_CONTRACT_UNDOCUMENTED',
      response: { reason: 'TASKGO_IDEMPOTENCY_REQUIRED' },
    });
  });

  it.each([
    [{}, 'PAGARME_CAPABILITY_SANDBOX is not enabled'],
    [
      { PAGARME_CAPABILITY_SANDBOX: 'true' },
      'PAGARME_BASE_URL is not the Core v5 sandbox',
    ],
    [
      {
        PAGARME_CAPABILITY_SANDBOX: 'true',
        PAGARME_BASE_URL: 'https://sdx-api.pagar.me/core/v5',
      },
      'PAGARME_SECRET_KEY is not a sandbox credential',
    ],
    [
      {
        PAGARME_CAPABILITY_SANDBOX: 'true',
        PAGARME_BASE_URL: 'https://sdx-api.pagar.me/core/v5',
        PAGARME_SECRET_KEY: ['sk', 'test', 'sanitized'].join('_'),
      },
      'PAGARME_CAPABILITY_RECIPIENT_ID is not configured',
    ],
  ])('provides an explicit sandbox skip reason', (env, expected) => {
    expect(sandboxSkipReason(env)).toBe(expected);
  });

  it.each([
    [{}, 'PAGARME_CAPABILITY_SANDBOX is not enabled'],
    [
      { PAGARME_CAPABILITY_SANDBOX: 'true' },
      'PAGARME_BASE_URL is not the Core v5 sandbox',
    ],
    [
      {
        PAGARME_CAPABILITY_SANDBOX: 'true',
        PAGARME_BASE_URL: 'https://sdx-api.pagar.me/core/v5',
      },
      'PAGARME_SECRET_KEY is not a sandbox credential',
    ],
    [
      {
        PAGARME_CAPABILITY_SANDBOX: 'true',
        PAGARME_BASE_URL: 'https://sdx-api.pagar.me/core/v5',
        PAGARME_SECRET_KEY: ['sk', 'test', 'sanitized'].join('_'),
      },
      'PAGARME_CAPABILITY_RECIPIENT_PAYLOAD is not configured',
    ],
  ])('provides an explicit mutation-suite skip reason', (env, expected) => {
    expect(sandboxMutationSkipReason(env)).toBe(expected);
  });
});

const liveSkipReason = sandboxSkipReason(process.env);
const describeSandbox = liveSkipReason ? describe.skip : describe;

describeSandbox('Pagar.me Core v5 sandbox payout capability', () => {
  it('retrieves the configured recipient without serializing submitted financial values', async () => {
    const authorization = Buffer.from(
      `${process.env.PAGARME_SECRET_KEY}:`,
    ).toString('base64');
    const response = await fetch(
      `${process.env.PAGARME_BASE_URL}/recipients/${process.env.PAGARME_CAPABILITY_RECIPIENT_ID}`,
      {
        headers: {
          Authorization: `Basic ${authorization}`,
          Accept: 'application/json',
        },
      },
    );
    const body = await response.json();

    expect(response.ok).toBe(true);
    expect(body.id).toBe(process.env.PAGARME_CAPABILITY_RECIPIENT_ID);
    expect(() =>
      assertSanitized({
        id: body.id,
        status: body.status,
        default_bank_account: body.default_bank_account && {
          id: body.default_bank_account.id,
          status: body.default_bank_account.status,
        },
      }),
    ).not.toThrow();
  });
});

if (liveSkipReason) {
  describe('Pagar.me sandbox capability precondition', () => {
    it('reports why live sandbox evidence is unavailable', () => {
      expect(liveSkipReason).toBe('PAGARME_CAPABILITY_SANDBOX is not enabled');
    });
  });
}

const mutationSkipReason = sandboxMutationSkipReason(process.env);
const describeSandboxMutations = mutationSkipReason ? describe.skip : describe;

describeSandboxMutations('Pagar.me Core v5 sandbox recipient mutations', () => {
  const baseUrl = process.env.PAGARME_BASE_URL!;
  const authorization = Buffer.from(
    `${process.env.PAGARME_SECRET_KEY}:`,
  ).toString('base64');
  const idempotencyKey = process.env.PAGARME_CAPABILITY_IDEMPOTENCY_KEY!;
  const recipientPayload = JSON.parse(
    process.env.PAGARME_CAPABILITY_RECIPIENT_PAYLOAD || '{}',
  );
  const bankPayload = JSON.parse(
    process.env.PAGARME_CAPABILITY_BANK_PAYLOAD || '{}',
  );
  let recipientId: string;

  async function request(
    path: string,
    method: string,
    body: unknown,
    key?: string,
  ) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${authorization}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: JSON.stringify(body),
    });
    return { response, body: await response.json() };
  }

  it('creates a disposable recipient and returns a gateway identifier', async () => {
    const result = await request(
      '/recipients',
      'POST',
      recipientPayload,
      idempotencyKey,
    );
    expect(result.response.ok).toBe(true);
    expect(result.body.id).toEqual(expect.any(String));
    recipientId = result.body.id;
  });

  it('rejects an empty recipient payload without exposing financial input', async () => {
    const result = await request(
      '/recipients',
      'POST',
      {},
      `${idempotencyKey}-invalid`,
    );
    expect([400, 422]).toContain(result.response.status);
    expect(JSON.stringify(result.body)).not.toContain(
      process.env.PAGARME_SECRET_KEY,
    );
  });

  it('replays the same idempotency key and payload without creating a second recipient', async () => {
    const result = await request(
      '/recipients',
      'POST',
      recipientPayload,
      idempotencyKey,
    );
    expect(result.response.ok).toBe(true);
    expect(result.body.id).toBe(recipientId);
  });

  it('does not create a second recipient when the same key is reused with a conflicting code', async () => {
    const conflictingPayload = {
      ...recipientPayload,
      code: `${recipientPayload.code}-conflict`,
    };
    const result = await request(
      '/recipients',
      'POST',
      conflictingPayload,
      idempotencyKey,
    );
    expect(result.response.ok ? result.body.id : recipientId).toBe(recipientId);
  });

  it('updates the disposable recipient bank account or exposes the documented allowlist requirement', async () => {
    const result = await request(
      `/recipients/${recipientId}/default-bank-account`,
      'PATCH',
      { bank_account: bankPayload },
    );
    if (!result.response.ok) {
      expect(result.response.status).toBe(400);
      expect(result.body.message).toContain('Second authentication factor');
      return;
    }
    expect(result.body.id ?? result.body.default_bank_account?.id).toEqual(
      expect.any(String),
    );
  });
});

if (mutationSkipReason) {
  describe('Pagar.me sandbox mutation precondition', () => {
    it('reports why recipient mutation evidence is unavailable', () => {
      expect(mutationSkipReason).toBe(
        'PAGARME_CAPABILITY_SANDBOX is not enabled',
      );
    });
  });
}
