import { ReservationExpiryService } from './reservation-expiry.service';
describe('Reservation expiry payment safety', () => {
  let prisma: any, payments: any, service: ReservationExpiryService;
  beforeEach(() => {
    prisma = {
      order: { findMany: jest.fn(), updateMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction = jest.fn((work) => work(prisma));
    payments = { reconcilePayment: jest.fn() };
    service = new ReservationExpiryService(prisma, payments);
  });
  it('releases an expired unpaid reservation under the order lock', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 1n, payment: { id: 2n, status: 'CREATED' }, paymentAttempt: null },
    ]);
    await service.sweep();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const args = prisma.order.updateMany.mock.calls[0][0];
    expect(args.where.reservationExpiresAt.lte).toBeInstanceOf(Date);
    expect(args.where.status.in).toEqual([
      'AGUARDANDO_APROVACAO',
      'AGUARDANDO_PAGAMENTO',
    ]);
    expect(args.where.payment.status.in).not.toEqual(
      expect.arrayContaining(['PAGO', 'PAID', 'PENDING']),
    );
    expect(args.data.status).toBe('CANCELADO');
  });
  it('never releases a charge attempt whose result is unknown', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 1n, payment: { id: 2n }, paymentAttempt: { orderId: 1n } },
    ]);
    await service.sweep();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('reconciles a linked charge before evaluating cancellation', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 1n,
        payment: { id: 2n, providerChargeId: 'ch_1' },
        paymentAttempt: { orderId: 1n },
      },
    ]);
    await service.sweep();
    expect(payments.reconcilePayment).toHaveBeenCalledWith(2n);
    expect(payments.reconcilePayment.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
  });
  it('does not cancel when reconciliation cannot prove payment state', async () => {
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});
    prisma.order.findMany.mockResolvedValue([
      { id: 1n, payment: { id: 2n, providerChargeId: 'ch_1' } },
    ]);
    payments.reconcilePayment.mockRejectedValue(
      new Error('gateway unavailable'),
    );
    await service.sweep();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
