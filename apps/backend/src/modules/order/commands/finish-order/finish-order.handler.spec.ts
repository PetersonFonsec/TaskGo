import { FinishOrderHandler } from './finish-order.handler';
import { FinishOrderCommand } from './finish-order.command';

describe('Finish order financial integrity', () => {
  let db: any;
  let order: any;
  let handler: FinishOrderHandler;
  beforeEach(() => {
    order = {
      status: 'EM_ANDAMENTO',
      finalPrice: 150,
      payment: { method: 'PIX', amount: 150, status: 'PAGO' },
      service: { providerId: 42n, provider: { status: 'APPROVED' } },
    };
    db = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn().mockResolvedValue({ id: 1n, finalPrice: 150 }),
      },
      orderCompletion: { upsert: jest.fn() },
      orderTimeline: { create: jest.fn() },
    };
    db.$transaction = jest.fn((fn) => fn(db));
    handler = new FinishOrderHandler(db);
  });
  it.each([0, 149, 151])('refuses price changes to %s', async (finalPrice) => {
    await expect(
      handler.execute(new FinishOrderCommand(1n, 42n, { finalPrice })),
    ).rejects.toThrow('Final price');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('refuses unfunded PIX and blocked providers', async () => {
    order.payment.status = 'AUTHORIZED';
    await expect(
      handler.execute(new FinishOrderCommand(1n, 42n, { finalPrice: 150 })),
    ).rejects.toThrow();
    order.payment.status = 'PAGO';
    order.service.provider.status = 'SUSPENDED';
    await expect(
      handler.execute(new FinishOrderCommand(1n, 42n, { finalPrice: 150 })),
    ).rejects.toThrow();
  });
  it('persists fixed price and timeline with compare-and-set', async () => {
    await handler.execute(new FinishOrderCommand(1n, 42n, { finalPrice: 150 }));
    expect(db.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n, status: 'EM_ANDAMENTO' },
        data: expect.objectContaining({
          finalPrice: 150,
          priceAdjusted: false,
        }),
      }),
    );
    expect(db.orderTimeline.create).toHaveBeenCalledTimes(1);
  });
});
