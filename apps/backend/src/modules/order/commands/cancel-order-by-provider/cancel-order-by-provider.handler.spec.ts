import { CancelOrderByProviderCommand } from './cancel-order-by-provider.command';
import { CancelOrderByProviderHandler } from './cancel-order-by-provider.handler';

describe('CancelOrderByProviderHandler', () => {
  const client = { email: 'cliente@proxi.test', name: 'Cliente' };
  let order: any;
  let db: any;
  let payments: { cancelPayment: jest.Mock };
  let notifications: { notifyClientOrderCanceledByProvider: jest.Mock };
  let handler: CancelOrderByProviderHandler;

  beforeEach(() => {
    order = {
      status: 'AGUARDANDO_APROVACAO',
      client,
      payment: { id: 5n, status: 'CREATED' },
      service: { title: 'Pintura', providerId: 42n },
    };
    db = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn().mockResolvedValue({ id: 1n, status: 'CANCELADO' }),
      },
    };
    payments = {
      cancelPayment: jest.fn().mockResolvedValue({ status: 'CANCELADO' }),
    };
    notifications = { notifyClientOrderCanceledByProvider: jest.fn() };
    handler = new CancelOrderByProviderHandler(
      db,
      payments as any,
      notifications as any,
    );
  });

  it('tells the client the request was refused', async () => {
    await handler.execute(new CancelOrderByProviderCommand(1n, 42n));

    expect(
      notifications.notifyClientOrderCanceledByProvider,
    ).toHaveBeenCalledWith(
      client,
      { id: 1n, serviceTitle: 'Pintura' },
      { refused: true, refunded: false },
    );
  });

  it('mentions the refund when a scheduled paid order is cancelled', async () => {
    order.status = 'AGENDADO';
    payments.cancelPayment.mockResolvedValue({ status: 'REEMBOLSADO' });

    await handler.execute(new CancelOrderByProviderCommand(1n, 42n));

    expect(
      notifications.notifyClientOrderCanceledByProvider,
    ).toHaveBeenCalledWith(
      client,
      { id: 1n, serviceTitle: 'Pintura' },
      { refused: false, refunded: true },
    );
  });

  it('does not notify when the cancellation is not persisted', async () => {
    payments.cancelPayment.mockRejectedValue(new Error('gateway timeout'));

    await expect(
      handler.execute(new CancelOrderByProviderCommand(1n, 42n)),
    ).rejects.toThrow('gateway timeout');
    expect(db.order.update).not.toHaveBeenCalled();
    expect(
      notifications.notifyClientOrderCanceledByProvider,
    ).not.toHaveBeenCalled();
  });
});
