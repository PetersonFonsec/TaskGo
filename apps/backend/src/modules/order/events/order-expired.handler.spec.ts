import { OrderExpiredEvent } from './order-expired.event';
import { OrderExpiredHandler } from './order-expired.handler';

describe('OrderExpiredHandler', () => {
  const client = { email: 'cliente@proxi.test', name: 'Cliente' };
  const provider = { email: 'prestador@proxi.test', name: 'Prestador' };
  let db: any;
  let notifications: { notifyOrderExpired: jest.Mock };
  let handler: OrderExpiredHandler;

  beforeEach(() => {
    db = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1n,
          scheduledFor: null,
          client,
          service: { title: 'Pintura', provider: { user: provider } },
        }),
      },
    };
    notifications = { notifyOrderExpired: jest.fn() };
    handler = new OrderExpiredHandler(db, notifications as any);
  });

  it('notifies both parts when the provider did not answer', async () => {
    await handler.handle(
      new OrderExpiredEvent(
        1n,
        'AGUARDANDO_APROVACAO',
        'APPROVAL_TIMEOUT',
        new Date(),
      ),
    );

    expect(notifications.notifyOrderExpired).toHaveBeenCalledWith(
      client,
      provider,
      { id: 1n, serviceTitle: 'Pintura', scheduledFor: null },
      'PROVIDER',
    );
  });

  it('marks payment timeouts as waiting for payment', async () => {
    await handler.handle(
      new OrderExpiredEvent(
        1n,
        'AGUARDANDO_PAGAMENTO',
        'PAYMENT_TIMEOUT',
        new Date(),
      ),
    );

    expect(notifications.notifyOrderExpired.mock.calls[0][3]).toBe('PAYMENT');
  });

  it('does not throw when loading the order fails', async () => {
    db.order.findUnique.mockRejectedValue(new Error('db down'));

    await expect(
      handler.handle(
        new OrderExpiredEvent(
          1n,
          'AGUARDANDO_APROVACAO',
          'APPROVAL_TIMEOUT',
          new Date(),
        ),
      ),
    ).resolves.toBeUndefined();
    expect(notifications.notifyOrderExpired).not.toHaveBeenCalled();
  });
});
