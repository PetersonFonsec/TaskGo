import { createHmac } from 'crypto';
import {
  ABACATEPAY_PUBLIC_KEY,
  AbacatePayWebhookController,
} from './abacatepay-webhook.controller';

describe('AbacatePay webhook security', () => {
  let controller: AbacatePayWebhookController,
    prisma: any,
    payments: any,
    settlements: any;
  const payload = {
    id: 'log_1',
    event: 'transparent.completed',
    apiVersion: 2,
    devMode: false,
    data: { transparent: { id: 'pix_1', status: 'PAID' } },
  };
  function signed(body: any = payload) {
    const rawBody = Buffer.from(JSON.stringify(body));
    return [
      { body, rawBody },
      'secret',
      createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
        .update(rawBody)
        .digest('base64'),
    ] as const;
  }
  beforeEach(() => {
    prisma = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({ id: 1n }),
        update: jest.fn(),
      },
      paymentSettlement: {
        findUnique: jest.fn().mockResolvedValue({ paymentId: 1n }),
      },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction = (cb: any) => cb(prisma);
    payments = { reconcilePayment: jest.fn() };
    settlements = { process: jest.fn() };
    controller = new AbacatePayWebhookController(
      {
        get: (key: string) =>
          key === 'payment.webhookSecret' ? 'secret' : false,
      } as any,
      prisma,
      payments,
      settlements,
    );
  });
  it('requires both secret and signature before database access', async () => {
    const [req, secret, signature] = signed();
    await expect(
      controller.webhook(req as any, 'wrong', signature),
    ).rejects.toThrow('Webhook inválido');
    await expect(
      controller.webhook(req as any, secret, 'wrong'),
    ).rejects.toThrow('Webhook inválido');
    await expect(
      controller.webhook(
        { ...req, rawBody: Buffer.from('{}') } as any,
        secret,
        signature,
      ),
    ).rejects.toThrow('Webhook inválido');
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });
  it('uses the authenticated canonical resource instead of trusting payload status', async () => {
    const [req, secret, signature] = signed();
    await controller.webhook(req as any, secret, signature);
    expect(payments.reconcilePayment).toHaveBeenCalledWith(1n);
    expect(prisma.paymentWebhookEvent.upsert).toHaveBeenCalled();
  });
  it('acknowledges duplicates without replaying financial work', async () => {
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      processedAt: new Date(),
    });
    const [req, secret, signature] = signed();
    await controller.webhook(req as any, secret, signature);
    expect(payments.reconcilePayment).not.toHaveBeenCalled();
  });
  it('requests a retry when creation is not linked yet', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);
    const [req, secret, signature] = signed();
    await expect(
      controller.webhook(req as any, secret, signature),
    ).rejects.toThrow('reenviar');
    expect(prisma.paymentWebhookEvent.upsert).not.toHaveBeenCalled();
  });
  it('blocks release on gateway disputes even if current charge remains paid', async () => {
    const [req, secret, signature] = signed({
      ...payload,
      event: 'transparent.disputed',
    });
    await controller.webhook(req as any, secret, signature);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { settlementBlockedAt: expect.any(Date) },
      }),
    );
  });
  it('reconciles transfer events through the persisted settlement', async () => {
    const [req, secret, signature] = signed({
      ...payload,
      event: 'transfer.completed',
      data: { transfer: { externalId: 'taskgo-payment-1' } },
    });
    await controller.webhook(req as any, secret, signature);
    expect(settlements.process).toHaveBeenCalledWith(1n);
  });
});
