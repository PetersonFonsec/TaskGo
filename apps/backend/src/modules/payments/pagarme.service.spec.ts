import { PagarmeGatewayException, PagarmeService } from './pagarme.service';

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
  describe('recipients', () => {
    const bankAccount = {
      holderName: 'Maria',
      holderType: 'individual' as const,
      holderDocument: '52998224725',
      bank: '341',
      branchNumber: '1234',
      branchCheckDigit: null,
      accountNumber: '987654',
      accountCheckDigit: '1',
      type: 'checking' as const,
    };
    const recipient = {
      idempotencyKey: 'payout-7-abc',
      code: 'taskgo-provider-7',
      name: 'Maria',
      email: 'maria@example.com',
      document: '52998224725',
      type: 'individual' as const,
      phone: { ddd: '11', number: '999998888' },
      bankAccount,
    };

    it('creates a recipient with register information and returns only its state', async () => {
      const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 're_1',
          status: 'registration',
          document: '52998224725',
          default_bank_account: { status: 'active', account_number: '987654' },
        }),
      } as any);

      const result = await service.createRecipient(recipient);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://gateway.invalid/recipients');
      expect(init!.method).toBe('POST');
      expect(init!.headers).toEqual(
        expect.objectContaining({ 'Idempotency-key': 'payout-7-abc' }),
      );
      const body = JSON.parse(init!.body as string);
      expect(body.register_information).toEqual(
        expect.objectContaining({
          type: 'individual',
          document: '52998224725',
          name: 'Maria',
          phone_numbers: [{ ddd: '11', number: '999998888', type: 'mobile' }],
        }),
      );
      expect(body.default_bank_account).toEqual({
        holder_name: 'Maria',
        holder_type: 'individual',
        holder_document: '52998224725',
        bank: '341',
        branch_number: '1234',
        account_number: '987654',
        account_check_digit: '1',
        type: 'checking',
      });
      expect(result).toEqual({
        recipientId: 're_1',
        status: 'registration',
        bankStatus: 'active',
      });
    });

    it('updates the default bank account of a recipient', async () => {
      const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 're_1', status: 'active' }),
      } as any);

      await service.updateRecipientBankAccount('re_1', bankAccount, 'key-1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://gateway.invalid/recipients/re_1/default-bank-account',
      );
      expect(init!.method).toBe('PATCH');
      expect(JSON.parse(init!.body as string).bank_account.bank).toBe('341');
    });

    it.each([
      [422, 'VALIDATION'],
      [401, 'AUTHENTICATION'],
      [503, 'TRANSIENT'],
    ])('categorizes gateway HTTP %d as %s', async (status, category) => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
      } as any);

      const error = await service.createRecipient(recipient).catch((e) => e);

      expect(error).toBeInstanceOf(PagarmeGatewayException);
      expect(error.category).toBe(category);
    });

    it('categorizes network failures as transient', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'));

      const error = await service.getRecipient('re_1').catch((e) => e);

      expect(error.category).toBe('TRANSIENT');
    });

    it('does not send requests for foreign recipient identifiers', async () => {
      const fetchMock = jest.spyOn(globalThis, 'fetch');

      await expect(service.getRecipient('re_sim_1/../orders')).rejects.toThrow(
        'inválido',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('simulates an active recipient without network calls', async () => {
      const simulated = new PagarmeService({
        get: () => '',
        getOrThrow: (key: string) =>
          key === 'payment.baseUrl' ? 'https://gateway.invalid' : true,
      } as any);
      const fetchMock = jest.spyOn(globalThis, 'fetch');

      const result = await simulated.createRecipient(recipient);

      expect(result).toEqual(
        expect.objectContaining({ status: 'active', bankStatus: 'active' }),
      );
      expect(result.recipientId).toMatch(/^re_sim_/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
