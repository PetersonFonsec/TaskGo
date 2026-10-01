import { CreateOrderPaymentHandler } from './create-order-payment.handler';
import { PixTransferStrategy } from '../../settlement/pix-transfer.strategy';
import { SettlementStrategies } from '../../settlement/settlement-strategies';

describe('CreateOrderPaymentHandler with durable creation claim', () => {
  let order: any,
    tx: any,
    prisma: any,
    gateway: any,
    handler: CreateOrderPaymentHandler,
    notifications: { notifyClientPaymentConfirmed: jest.Mock },
    attempt: any;
  beforeEach(() => {
    attempt = undefined;
    order = {
      clientId: 2n,
      status: 'AGUARDANDO_PAGAMENTO',
      finalPrice: 120,
      scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      client: {
        name: 'Cliente',
        email: 'test@example.com',
        cpf: '12345678901',
      },
      payment: {
        id: 5n,
        orderId: 10n,
        provider: 'ABACATEPAY',
        method: 'PIX',
        status: 'CREATED',
        amount: 120,
      },
      service: {
        title: 'Pintura',
        basePrice: 120,
        platformFeePct: 0.12,
        category: 'reparo',
        provider: {
          payoutProfile: { pixKey: 'test@example.com', pixKeyType: 'EMAIL' },
        },
      },
    };
    tx = {
      $queryRaw: jest.fn(),
      order: {
        findUniqueOrThrow: jest.fn(async () => order),
        updateMany: jest.fn(),
      },
      paymentAttempt: {
        upsert: jest.fn(
          async ({ create }) => (attempt ??= { ...create, submittedAt: null }),
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
      paymentAttempt: {
        updateMany: jest.fn(async () => {
          if (attempt.submittedAt) return { count: 0 };
          attempt.submittedAt = new Date();
          return { count: 1 };
        }),
      },
    };
    gateway = {
      provider: 'ABACATEPAY',
      createPixPayment: jest.fn().mockResolvedValue({
        orderId: 'pix_1',
        chargeId: 'pix_1',
        status: 'pending',
        qrCode: 'pix',
        raw: {},
      }),
      findPixPayment: jest.fn().mockResolvedValue(null),
    };
    notifications = { notifyClientPaymentConfirmed: jest.fn() };
    handler = new CreateOrderPaymentHandler(
      prisma,
      gateway,
      { getOrThrow: () => 0.12 } as any,
      new SettlementStrategies(new PixTransferStrategy(gateway)),
      notifications as any,
    );
  });
  const command = () =>
    ({ orderId: 10n, clientId: 2n, payload: { method: 'PIX' } }) as any;
  it('persists allocation, destination and strategy and does not schedule pending PIX', async () => {
    const result = await handler.execute(command());
    expect(result.status).toBe('PENDENTE');
    expect(result.platformAmount).toBe(14.4);
    expect(result.providerAmount).toBe(105.6);
    expect(order.payment.settlementStrategy).toBe('PIX_TRANSFER');
    expect(order.payment.settlementDestination).toEqual({
      key: 'test@example.com',
      type: 'EMAIL',
    });
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(
      prisma.paymentAttempt.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(gateway.createPixPayment.mock.invocationCallOrder[0]);
    expect(notifications.notifyClientPaymentConfirmed).not.toHaveBeenCalled();
  });
  it('notifies the client when the PIX is paid immediately and the order is scheduled', async () => {
    tx.order.updateMany.mockResolvedValue({ count: 1 });
    gateway.createPixPayment.mockResolvedValue({
      orderId: 'pix_1',
      chargeId: 'pix_1',
      status: 'paid',
      qrCode: 'pix',
      raw: {},
    });
    await handler.execute(command());
    expect(notifications.notifyClientPaymentConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', name: 'Cliente' }),
      {
        id: 10n,
        serviceTitle: 'Pintura',
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    );
  });
  it('recovers timeout by lookup only, retaining the original amount and destination', async () => {
    gateway.createPixPayment.mockRejectedValueOnce(new Error('timeout'));
    await expect(handler.execute(command())).rejects.toThrow('timeout');
    order.finalPrice = 999;
    order.service.provider.payoutProfile.pixKey = 'changed@example.com';
    gateway.findPixPayment.mockResolvedValue({
      orderId: 'pix_1',
      chargeId: 'pix_1',
      status: 'pending',
      qrCode: 'pix',
      raw: {},
    });
    await handler.execute(command());
    expect(gateway.createPixPayment).toHaveBeenCalledTimes(1);
    expect(gateway.findPixPayment.mock.calls[0][0].amountCents).toBe(12000);
    expect(order.payment.settlementDestination.key).toBe('test@example.com');
  });
  it('does not resend an ambiguous operation even if lookup finds nothing', async () => {
    gateway.createPixPayment.mockRejectedValueOnce(new Error('timeout'));
    await expect(handler.execute(command())).rejects.toThrow('timeout');
    await expect(handler.execute(command())).rejects.toThrow(
      'pendente de conciliação',
    );
    expect(gateway.createPixPayment).toHaveBeenCalledTimes(1);
  });
  it('rejects a legacy attempt before network', async () => {
    attempt = { provider: 'PAGARME', method: 'PIX' };
    await expect(handler.execute(command())).rejects.toThrow('outro provedor');
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('does not replace an expired QR', async () => {
    order.payment.status = 'PENDENTE';
    order.payment.pixExpiresAt = new Date(0);
    await expect(handler.execute(command())).rejects.toThrow('PIX expirado');
  });
  it('blocks raw card and missing PIX destination', async () => {
    await expect(
      handler.execute({
        ...command(),
        payload: { method: 'CARTAO', card: { number: '4111111111111111' } },
      }),
    ).rejects.toThrow('Somente PIX');
    order.service.provider.payoutProfile.pixKey = null;
    await expect(handler.execute(command())).rejects.toThrow(
      'não está habilitado',
    );
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
  it('rejects cross-client access', async () => {
    await expect(
      handler.execute({ ...command(), clientId: 99n }),
    ).rejects.toThrow('Apenas o cliente');
  });
  it('blocks a payout below the gateway minimum before collecting money', async () => {
    order.finalPrice = 1;
    await expect(handler.execute(command())).rejects.toThrow(
      'pelo menos R$ 1,00',
    );
    expect(gateway.createPixPayment).not.toHaveBeenCalled();
  });
});
