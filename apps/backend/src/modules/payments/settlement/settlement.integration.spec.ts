import { PrismaClient } from '@prisma/client';
import { SettlementService } from './settlement.service';
import { PaymentService } from '../payment.service';
import { CreateOrderPaymentHandler } from '../commands/create-order-payment/create-order-payment.handler';
import { SettlementStrategies } from './settlement-strategies';
import { PixTransferStrategy } from './pix-transfer.strategy';

const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
describeDatabase('AbacatePay concurrency with PostgreSQL', () => {
  let db: PrismaClient,
    paymentId: bigint,
    orderId: bigint,
    clientId: bigint,
    providerId: bigint,
    serviceId: bigint;
  const gateway: any = {
    provider: 'ABACATEPAY',
    simulated: true,
    getCharge: jest.fn(),
    sendTransfer: jest.fn(),
    findTransfer: jest.fn(),
    createPixPayment: jest.fn(),
    findPixPayment: jest.fn(),
  };
  let strategies: SettlementStrategies;
  beforeAll(async () => {
    if (
      !databaseUrl ||
      new URL(databaseUrl).pathname !== '/taskgo_abacatepay_verify'
    )
      throw new Error('Use only the isolated verification database');
    db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await db.$connect();
    strategies = new SettlementStrategies(new PixTransferStrategy(gateway));
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    paymentId = 0n;
    const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const client = await db.user.create({
      data: {
        name: 'Test client',
        email: `${stamp}-client@example.test`,
        passwordHash: 'unused',
        cpf: `${stamp}c`,
        type: 'CLIENTE',
      },
    });
    const provider = await db.provider.create({
      data: {
        status: 'APPROVED',
        verified: true,
        user: {
          create: {
            name: 'Test provider',
            email: `${stamp}-provider@example.test`,
            passwordHash: 'unused',
            cpf: `${stamp}p`,
            type: 'PRESTADOR',
          },
        },
      },
    });
    await db.providerPayoutProfile.update({
      where: { providerId: provider.id },
      data: { pixKey: 'original@example.test', pixKeyType: 'EMAIL' },
    });
    const service = await db.service.create({
      data: {
        providerId: provider.id,
        title: 'Test',
        category: 'test',
        basePrice: 100,
        platformFeePct: 0.12,
        status: 'ATIVO',
      },
    });
    const order = await db.order.create({
      data: {
        clientId: client.id,
        serviceId: service.id,
        status: 'CONCLUIDO',
        finalPrice: 100,
        clientConfirmedAt: new Date(),
      },
    });
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider: 'ABACATEPAY',
        method: 'PIX',
        status: 'PAGO',
        amount: 100,
        providerAmount: 88,
        platformAmount: 12,
        settlementStrategy: 'PIX_TRANSFER',
        settlementDestination: { key: 'original@example.test', type: 'EMAIL' },
        providerChargeId: `pix_${stamp}`,
        providerOrderId: `pix_${stamp}`,
      },
    });
    paymentId = payment.id;
    orderId = order.id;
    clientId = client.id;
    providerId = provider.id;
    serviceId = service.id;
    const payments = new PaymentService(gateway, db as any, strategies, {
      notifyClientPaymentConfirmed: jest.fn(),
    } as any);
    await db.$transaction((tx) => payments.enqueueSettlement(tx, payment));
  });
  afterEach(async () => {
    if (!paymentId) return;
    await db.paymentSettlement.deleteMany({ where: { paymentId } });
    await db.paymentWebhookEvent.deleteMany({ where: { paymentId } });
    await db.paymentAttempt.deleteMany({ where: { orderId } });
    await db.orderTimeline.deleteMany({ where: { orderId } });
    await db.payment.delete({ where: { id: paymentId } });
    await db.order.delete({ where: { id: orderId } });
    await db.service.delete({ where: { id: serviceId } });
    await db.provider.delete({ where: { id: providerId } });
    await db.user.deleteMany({ where: { id: { in: [clientId, providerId] } } });
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  it('two replicas send once and retain the original destination', async () => {
    await db.providerPayoutProfile.update({
      where: { providerId },
      data: { pixKey: 'changed@example.test' },
    });
    gateway.sendTransfer.mockImplementation(async (input) => ({
      id: `txn_${paymentId}`,
      externalId: input.externalId,
      amount: input.amount,
      status: 'COMPLETE',
    }));
    gateway.findTransfer.mockResolvedValue(null);
    const a = new SettlementService(db as any, strategies, gateway);
    const b = new SettlementService(db as any, strategies, gateway);
    await Promise.all([a.process(paymentId), b.process(paymentId)]);
    expect(gateway.sendTransfer).toHaveBeenCalledTimes(1);
    expect(gateway.sendTransfer.mock.calls[0][0].destination.key).toBe(
      'original@example.test',
    );
    expect(
      (await db.paymentSettlement.findUniqueOrThrow({ where: { paymentId } }))
        .status,
    ).toBe('SUCCEEDED');
    expect(
      await db.orderTimeline.count({
        where: { orderId, event: 'PAYMENT_RELEASED' },
      }),
    ).toBe(1);
  });
  it('does not resend after the remote side succeeds but the response is lost', async () => {
    gateway.sendTransfer.mockRejectedValue(new Error('lost response'));
    const worker = new SettlementService(db as any, strategies, gateway);
    await expect(worker.process(paymentId)).rejects.toThrow('lost response');
    expect(
      (await db.paymentSettlement.findUniqueOrThrow({ where: { paymentId } }))
        .status,
    ).toBe('SUBMITTING');
    gateway.findTransfer.mockResolvedValue({
      id: `txn_${paymentId}`,
      externalId: `taskgo-payment-${paymentId}`,
      amount: 8800,
      status: 'COMPLETE',
    });
    await worker.process(paymentId);
    expect(gateway.sendTransfer).toHaveBeenCalledTimes(1);
    expect(
      (await db.paymentSettlement.findUniqueOrThrow({ where: { paymentId } }))
        .status,
    ).toBe('SUCCEEDED');
  });
  it('rolls back the payout intent with the client confirmation transaction', async () => {
    await db.paymentSettlement.delete({ where: { paymentId } });
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const payments = new PaymentService(gateway, db as any, strategies, {
      notifyClientPaymentConfirmed: jest.fn(),
    } as any);
    await expect(
      db.$transaction(async (tx) => {
        await payments.enqueueSettlement(tx, payment);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await db.paymentSettlement.count({ where: { paymentId } })).toBe(0);
  });
  it('two concurrent checkout requests create at most one remote charge', async () => {
    await db.paymentSettlement.delete({ where: { paymentId } });
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CREATED',
        providerChargeId: null,
        providerOrderId: null,
      },
    });
    await db.order.update({
      where: { id: orderId },
      data: { status: 'AGUARDANDO_PAGAMENTO' },
    });
    gateway.createPixPayment.mockResolvedValue({
      orderId: `pix_new_${paymentId}`,
      chargeId: `pix_new_${paymentId}`,
      status: 'pending',
      qrCode: 'test',
      qrCodeBase64: null,
      expiresAt: null,
      raw: {},
    });
    gateway.findPixPayment.mockResolvedValue(null);
    const handler = new CreateOrderPaymentHandler(
      db as any,
      gateway,
      { getOrThrow: () => 0.12 } as any,
      strategies,
      { notifyClientPaymentConfirmed: jest.fn() } as any,
    );
    const results = await Promise.allSettled([
      handler.execute({ orderId, clientId, payload: { method: 'PIX' } as any }),
      handler.execute({ orderId, clientId, payload: { method: 'PIX' } as any }),
    ]);
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    expect(gateway.createPixPayment).toHaveBeenCalledTimes(1);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: paymentId } })).status,
    ).toBe('PENDENTE');
  });
});
