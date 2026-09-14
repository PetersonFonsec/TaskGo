import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { ConfirmOrderCompletionCommand } from './confirm-order-completion.command';
import { ConfirmOrderCompletionHandler } from './confirm-order-completion.handler';

describe('ConfirmOrderCompletionHandler payment capture', () => {
  it('conclui PIX pago sem solicitar nova captura', async () => {
    const capturedAt = new Date('2026-06-30T20:00:00.000Z');
    const tx = {
      $queryRaw: jest.fn(),
      orderDispute: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderCompletion: { upsert: jest.fn() },
      payment: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ status: PaymentStatus.PAGO }),
        update: jest.fn().mockResolvedValue({
          status: PaymentStatus.PAGO,
          paidAt: capturedAt,
        }),
      },
      orderTimeline: { createMany: jest.fn() },
    };
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          clientId: 2n,
          status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
          providerFinishedAt: new Date(),
          finalPrice: 120,
          payment: {
            id: 5n,
            method: PaymentMethod.PIX,
            status: PaymentStatus.PAGO,
            amount: 120,
            providerChargeId: 'ch_1',
            paidAt: capturedAt,
            capturedAt: null,
          },
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    } as any;
    const payments = {
      reconcilePayment: jest
        .fn()
        .mockResolvedValue({ status: PaymentStatus.PAGO }),
      capturePayment: jest.fn().mockResolvedValue({ capturedAt }),
    } as any;
    const handler = new ConfirmOrderCompletionHandler(prisma, payments);

    const result = await handler.execute(
      new ConfirmOrderCompletionCommand(10n, 2n, {}),
    );

    expect(payments.capturePayment).not.toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.PAGO,
          capturedAt,
          paidAt: capturedAt,
        }),
      }),
    );
    expect(result.status).toBe(OrderStatus.CONCLUIDO);
  });
});

describe('Dispute confirmation boundary', () => {
  it('refuses completion while a dispute is open under the same order lock', async () => {
    const tx: any = {
      $queryRaw: jest.fn(),
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ status: 'PAGO' }),
      },
      orderDispute: { findFirst: jest.fn().mockResolvedValue({ id: 1n }) },
      order: { updateMany: jest.fn() },
    };
    const prisma: any = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          clientId: 2n,
          status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
          providerFinishedAt: new Date(),
          finalPrice: 120,
          payment: {
            id: 5n,
            method: 'PIX',
            status: 'PAGO',
            amount: 120,
            paidAt: new Date(),
          },
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const payment: any = {
      reconcilePayment: jest.fn().mockResolvedValue({ status: 'PAGO' }),
    };
    await expect(
      new ConfirmOrderCompletionHandler(prisma, payment).execute(
        new ConfirmOrderCompletionCommand(10n, 2n, {}),
      ),
    ).rejects.toThrow('Aguarde a análise');
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });
});
