import { BadRequestException } from '@nestjs/common';

import { ConfirmOrderByProviderCommand } from './confirm-order-by-provider.command';
import { ConfirmOrderByProviderHandler } from './confirm-order-by-provider.handler';

describe('ConfirmOrderByProviderHandler', () => {
  let order: any;
  let db: any;
  let notifications: { notifyClientOrderAccepted: jest.Mock };
  let handler: ConfirmOrderByProviderHandler;

  beforeEach(() => {
    order = {
      status: 'AGUARDANDO_APROVACAO',
      scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      client: { email: 'cliente@proxi.test', name: 'Cliente' },
      service: {
        title: 'Pintura',
        providerId: 42n,
        provider: { status: 'APPROVED' },
      },
    };
    db = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };
    notifications = { notifyClientOrderAccepted: jest.fn() };
    handler = new ConfirmOrderByProviderHandler(db, notifications as any);
  });

  it('invites the client to pay after the order is accepted', async () => {
    await handler.execute(new ConfirmOrderByProviderCommand(1n, 42n));

    expect(notifications.notifyClientOrderAccepted).toHaveBeenCalledWith(
      { email: 'cliente@proxi.test', name: 'Cliente' },
      {
        id: 1n,
        serviceTitle: 'Pintura',
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    );
    expect(
      notifications.notifyClientOrderAccepted.mock.invocationCallOrder[0],
    ).toBeGreaterThan(db.order.update.mock.invocationCallOrder[0]);
  });

  it('does not notify when the order cannot be accepted', async () => {
    order.status = 'AGENDADO';

    await expect(
      handler.execute(new ConfirmOrderByProviderCommand(1n, 42n)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.notifyClientOrderAccepted).not.toHaveBeenCalled();
  });

  it('does not notify when the compare-and-set update fails', async () => {
    db.order.update.mockRejectedValue(new Error('record not found'));

    await expect(
      handler.execute(new ConfirmOrderByProviderCommand(1n, 42n)),
    ).rejects.toThrow('record not found');
    expect(notifications.notifyClientOrderAccepted).not.toHaveBeenCalled();
  });
});
