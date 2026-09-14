import { CreateOrderPaymentHandler } from './create-order-payment.handler';

describe('CreateOrderPaymentHandler', () => {
  let order: any,
    tx: any,
    prisma: any,
    gateway: any,
    handler: CreateOrderPaymentHandler;
  beforeEach(() => {
    order = {
      clientId: 2n,
      status: 'AGUARDANDO_PAGAMENTO',
      finalPrice: 120,
      client: {
        name: 'Cliente',
        email: 'test@example.com',
        cpf: '12345678901',
      },
      payment: {
        id: 5n,
        orderId: 10n,
        method: 'PIX',
        status: 'CREATED',
        amount: 120,
      },
      service: {
        basePrice: 120,
        platformFeePct: 0.12,
        category: 'reparo',
        provider: {
          payoutProfile: {
            pagarmeRecipientId: 'rp_1',
            syncStatus: 'READY',
            bankAccountStatus: 'CONFIRMED',
          },
        },
      },
    };
    let attempt: any;
    tx = {
      $queryRaw: jest.fn(),
      order: {
        findUniqueOrThrow: jest.fn(async () => order),
        updateMany: jest.fn(),
      },
      paymentAttempt: {
        upsert: jest.fn(
          async ({ create }) =>
            (attempt ??= { ...create, createdAt: new Date() }),
        ),
      },
      payment: {
        findUnique: jest.fn(async () => order.payment),
        upsert: jest.fn(async ({ update }) =>
          Object.assign(order.payment, update),
        ),
      },
      orderTimeline: { create: jest.fn() },
    };
    prisma = {
      order: { findUnique: jest.fn(async () => order) },
      category: { findFirst: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(tx)),
    };
    gateway = {
      createPixPayment: jest.fn().mockResolvedValue({
        orderId: 'or_1',
        chargeId: 'ch_1',
        status: 'pending',
        qrCode: 'pix',
        raw: { status: 'pending' },
      }),
    };
    handler = new CreateOrderPaymentHandler(prisma, gateway, {
      get: () => 'rp_platform',
      getOrThrow: () => 0.12,
    } as any);
  });
  const command = () =>
    ({ orderId: 10n, clientId: 2n, payload: { method: 'PIX' } }) as any;
  it('persists idempotency before network and does not schedule pending PIX', async () => {
    const result = await handler.execute(command());
    expect(result.status).toBe('PENDENTE');
    expect(tx.paymentAttempt.upsert.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.createPixPayment.mock.invocationCallOrder[0],
    );
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(result.platformAmount).toBe(14.4);
  });
  it('reuses the immutable key/request after an ambiguous timeout', async () => {
    gateway.createPixPayment.mockRejectedValueOnce(new Error('timeout'));
    await expect(handler.execute(command())).rejects.toThrow('timeout');
    order.finalPrice = 999;
    await handler.execute(command());
    expect(gateway.createPixPayment.mock.calls[1][0]).toEqual(
      gateway.createPixPayment.mock.calls[0][0],
    );
    expect(order.payment.amount).toBe(120);
  });
  it('never retries beyond the sandbox idempotency retention', async () => {
    tx.paymentAttempt.upsert.mockResolvedValue({
      method: 'PIX',
      createdAt: new Date(Date.now() - 300000),
    });
    await expect(handler.execute(command())).rejects.toThrow(
      'pendente de conciliação',
    );
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('does not replace a charge or reuse an expired QR', async () => {
    order.payment.status = 'PENDENTE';
    order.payment.pixExpiresAt = new Date(0);
    await expect(handler.execute(command())).rejects.toThrow('PIX expirado');
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('blocks raw card and missing payout readiness before a gateway call', async () => {
    await expect(
      handler.execute({
        ...command(),
        payload: { method: 'CARTAO', card: { number: '4111111111111111' } },
      }),
    ).rejects.toThrow('Somente PIX');
    order.service.provider.payoutProfile.syncStatus = 'UNKNOWN';
    await expect(handler.execute(command())).rejects.toThrow(
      'não está habilitado',
    );
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('rejects cross-client access', async () => {
    await expect(
      handler.execute({ ...command(), clientId: 99n }),
    ).rejects.toThrow('Apenas o cliente');
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('does not turn an HTTP success with payment failure into scheduling', async () => {
    gateway.createPixPayment.mockResolvedValue({
      orderId: 'or_1',
      chargeId: 'ch_1',
      status: 'failed',
      raw: {},
    });
    expect((await handler.execute(command())).status).toBe('FALHOU');
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });
});
