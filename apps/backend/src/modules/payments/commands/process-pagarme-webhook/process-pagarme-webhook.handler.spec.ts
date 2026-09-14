import { ProcessPagarmeWebhookHandler } from './process-pagarme-webhook.handler';

describe('ProcessPagarmeWebhookHandler', () => {
  let prisma: any, payments: any, handler: ProcessPagarmeWebhookHandler;
  beforeEach(() => {
    prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue({ id: 1n }) },
      paymentWebhookEvent: { upsert: jest.fn() },
    };
    payments = { reconcilePayment: jest.fn() };
    handler = new ProcessPagarmeWebhookHandler(prisma, payments);
  });
  const command = {
    payload: {
      id: 'evt1',
      type: 'charge.paid',
      data: { id: 'ch_1', status: 'paid', card: { number: 'never-persist' } },
    },
  };
  it('treats a forged paid body only as a hint to query authenticated canonical state', async () => {
    await handler.execute(command);
    expect(payments.reconcilePayment).toHaveBeenCalledWith(1n);
    expect(
      prisma.paymentWebhookEvent.upsert.mock.calls[0][0].create.payload,
    ).toEqual({ chargeId: 'ch_1' });
  });
  it('does not acknowledge reconciliation failures', async () => {
    payments.reconcilePayment.mockRejectedValue(new Error('wrong account'));
    await expect(handler.execute(command)).rejects.toThrow('wrong account');
    expect(prisma.paymentWebhookEvent.upsert).not.toHaveBeenCalled();
  });
  it('keeps an early event pending and successfully processes the retry after linking', async () => {
    prisma.payment.findUnique.mockResolvedValueOnce(null);
    await expect(handler.execute(command)).rejects.toThrow(
      'ainda não vinculada',
    );
    expect(
      prisma.paymentWebhookEvent.upsert.mock.calls[0][0].create.processedAt,
    ).toBeNull();
    await handler.execute(command);
    expect(payments.reconcilePayment).toHaveBeenCalledTimes(1);
  });
  it('rejects path injection before gateway or DB lookup', async () => {
    await expect(
      handler.execute({
        payload: { ...command.payload, data: { id: 'ch_x/../../orders' } },
      }),
    ).rejects.toThrow('inválida');
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });
});
