import { PaymentService } from './payment.service';

describe('PaymentService financial integrity', () => {
  let payment: any, charge: any, tx: any, gateway: any, service: PaymentService;
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
        updateMany: jest.fn(),
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
    service = new PaymentService(
      gateway,
      { $transaction: async (cb: any) => cb(tx) } as any,
      { resolve: jest.fn() } as any,
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
