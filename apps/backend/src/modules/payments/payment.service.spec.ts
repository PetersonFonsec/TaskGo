import { PaymentService } from './payment.service';

describe('PaymentService financial integrity', () => {
  let payment: any, charge: any, tx: any, gateway: any, service: PaymentService;
  let notifications: { notifyClientPaymentConfirmed: jest.Mock };
  let db: any;
  beforeEach(() => {
    payment = {
      id: 1n,
      orderId: 2n,
      provider: 'ABACATEPAY',
      status: 'PAGO',
      amount: 120,
      providerChargeId: 'pix_1',
      providerOrderId: 'pix_1',
      method: 'PIX',
      refundRequestedAt: null,
      settlementStrategy: 'PIX_TRANSFER',
      settlementDestination: { key: 'test@example.com', type: 'EMAIL' },
      providerAmount: 105.6,
    };
    charge = {
      id: 'pix_1',
      order: { id: 'pix_1' },
      amount: 12000,
      status: 'paid',
    };
    tx = {
      $queryRaw: jest.fn(),
      payment: {
        findUniqueOrThrow: jest.fn(async () => payment),
        update: jest.fn(async ({ data }) => Object.assign(payment, data)),
        updateMany: jest.fn(async ({ data }) => {
          if (payment.refundRequestedAt) return { count: 0 };
          Object.assign(payment, data);
          return { count: 1 };
        }),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ status: 'AGENDADO' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      orderTimeline: { create: jest.fn() },
      paymentSettlement: { upsert: jest.fn() },
    };
    gateway = {
      provider: 'ABACATEPAY',
      getCharge: jest.fn(async () => charge),
      refundPayment: jest.fn(),
    };
    notifications = { notifyClientPaymentConfirmed: jest.fn() };
    db = {
      $transaction: async (cb: any) => cb(tx),
      order: {
        findUnique: jest.fn().mockResolvedValue({
          scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
          client: { email: 'cliente@proxi.test', name: 'Cliente' },
          service: { title: 'Pintura' },
        }),
      },
    };
    service = new PaymentService(
      gateway,
      db,
      { resolve: jest.fn() } as any,
      notifications as any,
    );
  });
  it.each(['amount', 'id'])('rejects a mismatched %s', async (field) => {
    charge[field] = field === 'amount' ? 1 : 'another';
    await expect(service.reconcilePayment(1n)).rejects.toThrow(
      'Cobrança divergente',
    );
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('never sends legacy payments to the new provider', async () => {
    payment.provider = 'PAGARME';
    await expect(service.reconcilePayment(1n)).rejects.toThrow('legado');
    expect(gateway.getCharge).not.toHaveBeenCalled();
  });
  it('does not regress a refund', async () => {
    payment.status = 'REEMBOLSADO';
    await service.reconcilePayment(1n);
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('schedules only after confirmed receipt', async () => {
    payment.status = 'PENDENTE';
    await service.reconcilePayment(1n);
    expect(tx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'AGENDADO' } }),
    );
  });
  it('notifies the client once when reconciliation schedules a paid PIX', async () => {
    payment.status = 'PENDENTE';
    await service.reconcilePayment(1n);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).toHaveBeenCalledWith(
      { email: 'cliente@proxi.test', name: 'Cliente' },
      {
        id: 2n,
        serviceTitle: 'Pintura',
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    );
    payment.status = 'PENDENTE';
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await service.reconcilePayment(1n);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).toHaveBeenCalledTimes(1);
  });
  it('keeps the reconciliation result when the notification lookup fails', async () => {
    payment.status = 'PENDENTE';
    db.order.findUnique.mockRejectedValue(new Error('db down'));
    await expect(service.reconcilePayment(1n)).resolves.toEqual(
      expect.objectContaining({ status: 'PAGO' }),
    );
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).not.toHaveBeenCalled();
  });
  it('does not notify while the PIX is still pending', async () => {
    payment.status = 'PENDENTE';
    charge.status = 'pending';
    await service.reconcilePayment(1n);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).not.toHaveBeenCalled();
  });
  it('keeps the refund claim on timeout and does not resubmit', async () => {
    gateway.refundPayment.mockRejectedValue(new Error('timeout'));
    await expect(service.cancelPayment(payment)).rejects.toThrow('timeout');
    expect(payment.refundRequestedAt).toBeInstanceOf(Date);
    await expect(service.cancelPayment(payment)).rejects.toThrow(
      'aguarde confirmação',
    );
    expect(gateway.refundPayment).toHaveBeenCalledTimes(1);
    expect(payment.status).toBe('PAGO');
  });
  it('does not locally cancel a payable pending QR', async () => {
    payment.status = 'PENDENTE';
    charge.status = 'pending';
    await expect(service.cancelPayment(payment)).rejects.toThrow(
      'aguarde expiração',
    );
    expect(gateway.refundPayment).not.toHaveBeenCalled();
  });
  it('rechecks order eligibility at the durable refund claim', async () => {
    tx.order.findUniqueOrThrow
      .mockResolvedValueOnce({ status: 'AGENDADO' })
      .mockResolvedValueOnce({ status: 'EM_ANDAMENTO' });
    await expect(service.cancelPayment(payment)).rejects.toThrow(
      'não pode mais',
    );
    expect(gateway.refundPayment).not.toHaveBeenCalled();
  });
  it('blocks cancellation during ambiguous creation', async () => {
    payment.status = 'CREATED';
    payment.providerChargeId = null;
    tx.paymentAttempt.findUnique.mockResolvedValue({ orderId: 2n });
    await expect(service.cancelPayment(payment)).rejects.toThrow(
      'pendente de conciliação',
    );
    tx.paymentAttempt.findUnique.mockResolvedValue(null);
    await service.cancelPayment(payment);
    expect(payment.status).toBe('CANCELADO');
  });
  it('queues the stored allocation in the caller transaction', async () => {
    await service.enqueueSettlement(tx, payment);
    expect(tx.paymentSettlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          amountCents: 10560,
          externalId: 'taskgo-payment-1',
          strategy: 'PIX_TRANSFER',
          destination: payment.settlementDestination,
        }),
      }),
    );
  });
  it('does not queue disputed money', async () => {
    payment.settlementBlockedAt = new Date();
    await expect(service.enqueueSettlement(tx, payment)).rejects.toThrow(
      'em análise',
    );
    expect(tx.paymentSettlement.upsert).not.toHaveBeenCalled();
  });
});
