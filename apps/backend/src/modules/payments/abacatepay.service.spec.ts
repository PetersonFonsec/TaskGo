import { AbacatePayService } from './abacatepay.service';

describe('AbacatePay v2 adapter', () => {
  const input = {
    idempotencyKey: 'attempt-1',
    orderId: 1n,
    amountCents: 10000,
    platformAmountCents: 1200,
    providerAmountCents: 8800,
    customer: {
      name: 'Customer',
      email: 'customer@example.com',
      cpf: '12345678901',
    },
  };
  let service: AbacatePayService, fetchMock: jest.SpyInstance;
  const ok = (data: unknown) => ({
    ok: true,
    status: 200,
    json: async () => ({ data, success: true, error: null }),
  });
  beforeEach(() => {
    service = new AbacatePayService({
      getOrThrow: () => false,
      get: (key: string) => (key === 'payment.secretKey' ? 'test-key' : false),
    } as any);
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());
  it('uses the transparent PIX contract and validates returned amount', async () => {
    fetchMock.mockResolvedValue(
      ok({
        id: 'pix_1',
        amount: 10000,
        status: 'PENDING',
        brCode: 'qr',
      }) as any,
    );
    expect((await service.createPixPayment(input)).chargeId).toBe('pix_1');
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.abacatepay.com/v2/transparents/create');
    expect(JSON.parse(request.body)).toEqual({
      method: 'PIX',
      data: expect.objectContaining({
        amount: 10000,
        externalId: 'attempt-1',
        metadata: { orderId: '1', attemptKey: 'attempt-1' },
      }),
    });
    expect(request.headers.Authorization).toBe('Bearer test-key');
    fetchMock.mockResolvedValue(
      ok({ id: 'pix_2', amount: 1, status: 'PAID', brCode: 'qr' }) as any,
    );
    await expect(service.createPixPayment(input)).rejects.toThrow('divergente');
  });
  it('sends to /pix/send with nested destination, not a withdrawal endpoint', async () => {
    fetchMock.mockResolvedValue(
      ok({
        id: 'txn_1',
        externalId: 'settlement-1',
        amount: 8800,
        status: 'PENDING',
      }) as any,
    );
    await service.sendTransfer({
      externalId: 'settlement-1',
      amount: 8800,
      destination: { key: 'provider@example.com', type: 'EMAIL' },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.abacatepay.com/v2/pix/send',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        pix: { key: 'provider@example.com', type: 'EMAIL' },
        amount: 8800,
      }),
    );
  });
  it('checks canonical amount from the filtered resource and status from /check', async () => {
    fetchMock
      .mockResolvedValueOnce(ok([{ id: 'pix_1', amount: 10000 }]) as any)
      .mockResolvedValueOnce(ok({ id: 'pix_1', status: 'PAID' }) as any);
    expect(await service.getCharge('pix_1')).toEqual({
      id: 'pix_1',
      order: { id: 'pix_1' },
      amount: 10000,
      status: 'paid',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('id=pix_1');
  });
  it('looks up transfers using externalId and does not fabricate a result on 404', async () => {
    fetchMock.mockResolvedValue({ status: 404 } as any);
    expect(await service.findTransfer('settlement-1')).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toContain(
      '/pix/get?externalId=settlement-1',
    );
  });
  it('does not retry mutations on network timeout', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(service.createPixPayment(input)).rejects.toThrow(
      'conciliação',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects API envelope failures even with HTTP 200', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, error: 'DENIED' }),
    } as any);
    await expect(service.refundPayment('pix_1')).rejects.toThrow(
      'não confirmou',
    );
  });
  it('refuses development money in real mode', async () => {
    fetchMock.mockResolvedValue(
      ok({
        id: 'pix_1',
        amount: 10000,
        status: 'PAID',
        brCode: 'qr',
        devMode: true,
      }) as any,
    );
    await expect(service.createPixPayment(input)).rejects.toThrow(
      'desenvolvimento',
    );
  });
});
