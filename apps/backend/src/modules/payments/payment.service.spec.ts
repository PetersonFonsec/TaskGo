import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentService } from './payment.service';

describe('PaymentService financial integrity', () => {
  let current: any, charge: any, tx: any, gateway: any, service: PaymentService;
  let notifications: { notifyClientPaymentConfirmed: jest.Mock };
  let db: any;
  beforeEach(() => {
    current = {
      id: 1n,
      orderId: 2n,
      status: PaymentStatus.AUTORIZADO,
      amount: 120,
      providerChargeId: 'ch_1',
      providerOrderId: 'or_1',
      method: 'PIX',
    };
    charge = {
      id: 'ch_1',
      order: { id: 'or_1' },
      amount: 12000,
      status: 'authorized_pending_capture',
    };
    tx = {
      $queryRaw: jest.fn(),
      payment: {
        findUniqueOrThrow: jest.fn(async () => current),
        update: jest.fn(async ({ data }) => Object.assign(current, data)),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE,
          finalPrice: 120,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      paymentAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      orderTimeline: { create: jest.fn() },
      paymentWebhookEvent: { updateMany: jest.fn() },
    };
    gateway = {
      getCharge: jest.fn(async () => charge),
      capturePayment: jest.fn(async () => ({ ...charge, status: 'paid' })),
      cancelPayment: jest.fn(async () => ({ ...charge, status: 'canceled' })),
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
    service = new PaymentService(gateway, db, notifications as any);
  });
  it('validates the gateway outcome before saving capture', async () => {
    gateway.capturePayment.mockResolvedValue({ ...charge, status: 'pending' });
    await expect(service.capturePayment(current)).rejects.toThrow(
      'Captura ainda não confirmada',
    );
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('recovers a successful gateway capture followed by a lost DB transaction without recapturing', async () => {
    charge.status = 'paid';
    await service.capturePayment(current);
    expect(gateway.capturePayment).not.toHaveBeenCalled();
    expect(current.status).toBe('PAGO');
  });
  it('rejects amount and account/order mismatches without mutations', async () => {
    charge.order.id = 'or_other';
    await expect(service.capturePayment(current)).rejects.toThrow(
      'Cobrança divergente',
    );
    expect(gateway.capturePayment).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('does not regress a refund when stale canonical state is paid', async () => {
    current.status = 'REEMBOLSADO';
    charge.status = 'paid';
    await service.reconcilePayment(current.id);
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('only schedules a PIX after canonical paid state', async () => {
    charge.status = 'pending';
    await service.reconcilePayment(current.id);
    expect(tx.order.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { status: 'AGUARDANDO_PAGAMENTO' } }),
    );
    charge.status = 'paid';
    await service.reconcilePayment(current.id);
    expect(tx.order.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { status: 'AGENDADO' } }),
    );
  });
  it('notifies the client once when reconciliation schedules a paid PIX', async () => {
    charge.status = 'paid';
    await service.reconcilePayment(current.id);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).toHaveBeenCalledWith(
      { email: 'cliente@proxi.test', name: 'Cliente' },
      {
        id: 2n,
        serviceTitle: 'Pintura',
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    );
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await service.reconcilePayment(current.id);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).toHaveBeenCalledTimes(1);
  });
  it('keeps the reconciliation result when the notification lookup fails', async () => {
    charge.status = 'paid';
    db.order.findUnique.mockRejectedValue(new Error('db down'));
    await expect(service.reconcilePayment(current.id)).resolves.toEqual(
      expect.objectContaining({ status: 'PAGO' }),
    );
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).not.toHaveBeenCalled();
  });
  it('does not notify while the PIX is still pending', async () => {
    charge.status = 'pending';
    await service.reconcilePayment(current.id);
    await new Promise(setImmediate);
    expect(notifications.notifyClientPaymentConfirmed).not.toHaveBeenCalled();
  });
  it('keeps order/payment unchanged on refund failure', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ status: 'AGENDADO' });
    charge.status = 'paid';
    gateway.cancelPayment.mockRejectedValue(new Error('timeout'));
    await expect(service.cancelPayment(current)).rejects.toThrow('timeout');
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
  it('cancels an uncharged order but blocks an ambiguous creation attempt', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ status: 'AGENDADO' });
    current.status = 'CREATED';
    current.providerChargeId = null;
    tx.paymentAttempt.findUnique.mockResolvedValue({ orderId: 2n });
    await expect(service.cancelPayment(current)).rejects.toThrow(
      'pendente de conciliação',
    );
    tx.paymentAttempt.findUnique.mockResolvedValue(null);
    await service.cancelPayment(current);
    expect(current.status).toBe('CANCELADO');
    expect(gateway.cancelPayment).not.toHaveBeenCalled();
  });
  it('does not refund a service already started', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ status: 'EM_EXECUCAO' });
    await expect(service.cancelPayment(current)).rejects.toThrow(
      'não pode mais ser cancelado',
    );
    expect(gateway.getCharge).not.toHaveBeenCalled();
  });
});
