import { PaymentStatus } from '@prisma/client';

import { ProcessPagarmeWebhookCommand } from './process-pagarme-webhook.command';
import { ProcessPagarmeWebhookHandler } from './process-pagarme-webhook.handler';

describe('ProcessPagarmeWebhookHandler', () => {
  it('processes charge.paid transactionally', async () => {
    const tx = {
      paymentWebhookEvent: { create: jest.fn() },
      payment: { update: jest.fn() },
    };
    const prisma: any = {
      paymentWebhookEvent: { findUnique: jest.fn().mockResolvedValue(null) },
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5n,
          paidAt: null,
          capturedAt: null,
          canceledAt: null,
          refundedAt: null,
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const handler = new ProcessPagarmeWebhookHandler(prisma);

    await handler.execute(
      new ProcessPagarmeWebhookCommand({
        id: 'evt_1',
        type: 'charge.paid',
        data: { id: 'ch_1' },
      }),
    );

    expect(tx.paymentWebhookEvent.create).toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.PAGO }),
      }),
    );
  });

  it('acknowledges an already processed webhook without writing again', async () => {
    const prisma: any = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: 'evt_1' }),
      },
      $transaction: jest.fn(),
    };
    const handler = new ProcessPagarmeWebhookHandler(prisma);

    await expect(
      handler.execute(
        new ProcessPagarmeWebhookCommand({
          id: 'evt_1',
          type: 'charge.paid',
          data: { id: 'ch_1' },
        }),
      ),
    ).resolves.toEqual({ received: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
