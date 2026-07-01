import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { ConfirmOrderCompletionCommand } from './confirm-order-completion.command';
import { ConfirmOrderCompletionHandler } from './confirm-order-completion.handler';

describe('ConfirmOrderCompletionHandler payment capture', () => {
  it('captura cartão autorizado antes de concluir o pedido', async () => {
    const capturedAt = new Date('2026-06-30T20:00:00.000Z');
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderCompletion: { upsert: jest.fn() },
      payment: { update: jest.fn().mockResolvedValue({ status: PaymentStatus.PAGO, paidAt: capturedAt }) },
      orderTimeline: { createMany: jest.fn() },
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue({
        clientId: 2n, status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
        providerFinishedAt: new Date(), finalPrice: 120,
        payment: { id: 5n, method: PaymentMethod.CARTAO, status: PaymentStatus.AUTORIZADO,
          amount: 120, providerChargeId: 'ch_1', paidAt: null, capturedAt: null },
      }) },
      $transaction: jest.fn((callback) => callback(tx)),
    } as any;
    const payments = { capturePayment: jest.fn().mockResolvedValue({ capturedAt }) } as any;
    const handler = new ConfirmOrderCompletionHandler(prisma, payments);

    const result = await handler.execute(new ConfirmOrderCompletionCommand(10n, 2n, {}));

    expect(payments.capturePayment).toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.PAGO, capturedAt, paidAt: capturedAt }),
    }));
    expect(result.status).toBe(OrderStatus.CONCLUIDO);
  });
});
