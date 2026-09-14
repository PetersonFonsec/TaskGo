import { PagarmeService } from './pagarme.service';

describe('PagarmeService transport contract', () => {
  let service: PagarmeService;
  const input: any = {
    idempotencyKey: 'durable-key',
    orderId: 2n,
    amountCents: 12000,
    platformAmountCents: 1440,
    providerAmountCents: 10560,
    providerRecipientId: 'rp_1',
    platformRecipientId: 'rp_2',
    customer: { name: 'Test', email: 'test@example.com', cpf: '12345678901' },
  };
  beforeEach(() => {
    service = new PagarmeService({
      get: () => 'fake-test-key',
      getOrThrow: (key: string) =>
        key === 'payment.baseUrl' ? 'https://gateway.invalid' : false,
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());
  it('sends the persisted idempotency key, timeout and correct split; only returns minimal metadata', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'or_1',
        customer: { document: 'sensitive' },
        charges: [
          {
            id: 'ch_1',
            amount: 12000,
            status: 'pending',
            last_transaction: { qr_code: 'pix' },
          },
        ],
      }),
    } as any);
    const result = await service.createPixPayment(input);
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.headers).toEqual(
      expect.objectContaining({ 'Idempotency-key': 'durable-key' }),
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(
      JSON.parse(init.body as string).payments[0].split.map(
        (p: any) => p.amount,
      ),
    ).toEqual([10560, 1440]);
    expect(result.raw).toEqual({
      id: 'or_1',
      chargeId: 'ch_1',
      status: 'pending',
    });
  });
  it('does not accept divergent gateway amount', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'or_1',
        charges: [{ id: 'ch_1', amount: 1, status: 'paid' }],
      }),
    } as any);
    await expect(service.createPixPayment(input)).rejects.toThrow('divergente');
  });
  it('does not treat a simulated-looking id as captured in real mode', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(service.capturePayment('ch_sim_fake', 120)).rejects.toThrow(
      'inválido',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects card processing before sending raw card data', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(service.authorizeCardPayment(input)).rejects.toThrow(
      'tokenização',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
