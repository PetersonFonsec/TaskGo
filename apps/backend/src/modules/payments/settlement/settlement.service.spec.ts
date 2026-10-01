import { SettlementService } from './settlement.service';

describe('durable PIX settlement', () => {
  let row: any,
    payment: any,
    order: any,
    tx: any,
    strategy: any,
    service: SettlementService,
    gateway: any;
  beforeEach(() => {
    row = {
      paymentId: 1n,
      strategy: 'PIX_TRANSFER',
      status: 'READY',
      amountCents: 8800,
      destination: { key: 'original@example.com', type: 'EMAIL' },
      externalId: 'taskgo-payment-1',
      transferId: null,
    };
    payment = {
      id: 1n,
      provider: 'ABACATEPAY',
      orderId: 2n,
      status: 'PAGO',
      amount: 100,
      providerAmount: 88,
      providerChargeId: 'pix_1',
    };
    order = { status: 'CONCLUIDO', clientConfirmedAt: new Date() };
    tx = {
      $queryRaw: jest.fn(),
      paymentSettlement: {
        findUniqueOrThrow: jest.fn(async () => ({ ...row })),
        update: jest.fn(async ({ data }) => Object.assign(row, data)),
        updateMany: jest.fn(),
      },
      payment: { findUniqueOrThrow: jest.fn(async () => payment) },
      order: { findUniqueOrThrow: jest.fn(async () => order) },
      orderDispute: { findFirst: jest.fn().mockResolvedValue(null) },
      orderTimeline: { create: jest.fn() },
    };
    strategy = {
      release: jest.fn().mockResolvedValue({
        id: 'txn_1',
        externalId: row.externalId,
        amount: 8800,
        status: 'COMPLETE',
      }),
      reconcile: jest.fn().mockResolvedValue(null),
    };
    gateway = {
      provider: 'ABACATEPAY',
      simulated: false,
      getCharge: jest
        .fn()
        .mockResolvedValue({ id: 'pix_1', amount: 10000, status: 'paid' }),
    };
    service = new SettlementService(
      {
        $transaction: async (cb: any) => cb(tx),
        paymentSettlement: tx.paymentSettlement,
      } as any,
      {
        resolve: (code: string) => {
          if (code !== 'PIX_TRANSFER') throw new Error('unsupported strategy');
          return strategy;
        },
      } as any,
      gateway,
    );
  });
  it('persists submission before sending and emits release only once', async () => {
    await service.process(1n);
    expect(row.status).toBe('SUCCEEDED');
    expect(
      tx.paymentSettlement.update.mock.invocationCallOrder[0],
    ).toBeLessThan(strategy.release.mock.invocationCallOrder[0]);
    expect(strategy.release).toHaveBeenCalledWith({
      externalId: row.externalId,
      amount: 8800,
      destination: row.destination,
    });
    await service.process(1n);
    expect(strategy.release).toHaveBeenCalledTimes(1);
    expect(tx.orderTimeline.create).toHaveBeenCalledTimes(1);
  });
  it('recovers a lost response by lookup, never resubmission', async () => {
    strategy.release.mockRejectedValue(new Error('timeout'));
    await expect(service.process(1n)).rejects.toThrow('timeout');
    expect(row.status).toBe('SUBMITTING');
    strategy.reconcile.mockResolvedValue({
      id: 'txn_1',
      externalId: row.externalId,
      amount: 8800,
      status: 'COMPLETE',
    });
    await service.process(1n);
    expect(row.status).toBe('SUCCEEDED');
    expect(strategy.release).toHaveBeenCalledTimes(1);
  });
  it('does not resend when a crash leaves an unlocated operation', async () => {
    row.status = 'SUBMITTING';
    await service.process(1n);
    expect(strategy.release).not.toHaveBeenCalled();
    expect(row.status).toBe('SUBMITTING');
  });
  it.each(['dispute', 'refund', 'not-confirmed', 'amount', 'gateway-dispute'])(
    'blocks unsafe release: %s',
    async (scenario) => {
      if (scenario === 'dispute')
        tx.orderDispute.findFirst.mockResolvedValue({ id: 1n });
      if (scenario === 'refund') payment.refundRequestedAt = new Date();
      if (scenario === 'not-confirmed')
        order.status = 'AGUARDANDO_CONFIRMACAO_CLIENTE';
      if (scenario === 'amount') payment.providerAmount = 99;
      if (scenario === 'gateway-dispute')
        payment.settlementBlockedAt = new Date();
      await service.process(1n);
      expect(row.status).toBe('BLOCKED');
      expect(strategy.release).not.toHaveBeenCalled();
    },
  );
  it('checks canonical receipt before release', async () => {
    gateway.getCharge.mockResolvedValue({
      id: 'pix_1',
      amount: 10000,
      status: 'refunded',
    });
    await expect(service.process(1n)).rejects.toThrow('não permite');
    expect(strategy.release).not.toHaveBeenCalled();
  });
  it('does not mark pending or failed transfers as released', async () => {
    strategy.release.mockResolvedValue({
      id: 'txn_1',
      externalId: row.externalId,
      amount: 8800,
      status: 'PENDING',
    });
    await service.process(1n);
    expect(row.status).toBe('PENDING');
    strategy.reconcile.mockResolvedValue({
      id: 'txn_1',
      externalId: row.externalId,
      amount: 8800,
      status: 'FAILED',
    });
    await service.process(1n);
    expect(row.status).toBe('FAILED');
    expect(tx.orderTimeline.create).not.toHaveBeenCalled();
  });
  it('rejects mismatched financial response', async () => {
    strategy.release.mockResolvedValue({
      id: 'txn_1',
      externalId: row.externalId,
      amount: 1,
      status: 'COMPLETE',
    });
    await expect(service.process(1n)).rejects.toThrow('divergente');
    expect(tx.orderTimeline.create).not.toHaveBeenCalled();
  });
  it('resolves the persisted strategy and fails closed for unknown implementations', async () => {
    row.strategy = 'UNKNOWN_FUTURE_SPLIT';
    await expect(service.process(1n)).rejects.toThrow('unsupported strategy');
    expect(strategy.release).not.toHaveBeenCalled();
  });
});
