import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { CancelOrderByProviderCommand } from './cancel-order-by-provider.command';
import { CancelOrderByProviderHandler } from './cancel-order-by-provider.handler';

describe('Cancel order by provider', () => {
  let db: any;
  let payments: any;
  let order: any;
  let handler: CancelOrderByProviderHandler;
  beforeEach(() => {
    order = {
      id: 1n,
      status: 'AGUARDANDO_APROVACAO',
      payment: null,
      service: { providerId: 42n },
    };
    db = {
      order: {
        findUnique: jest.fn(async () => order),
        update: jest.fn().mockResolvedValue({ id: 1n, status: 'CANCELADO' }),
      },
    };
    payments = { cancelPayment: jest.fn() };
    handler = new CancelOrderByProviderHandler(db, payments, {
      notifyClientOrderCanceledByProvider: jest.fn(),
    } as any);
  });

  it('persists the reason on the order and the timeline', async () => {
    await handler.execute(
      new CancelOrderByProviderCommand(1n, 42n, {
        reason: 'OUT_OF_AREA',
      }),
    );
    expect(db.order.update).toHaveBeenCalledWith({
      where: {
        id: 1n,
        status: {
          in: ['AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO', 'AGENDADO'],
        },
      },
      data: expect.objectContaining({
        status: 'CANCELADO',
        cancellationReason: 'OUT_OF_AREA',
        cancellationNote: null,
        orderTimeline: {
          create: expect.objectContaining({
            event: 'CANCELED',
            createdBy: 'PRESTADOR',
            description: 'Fora da área de atendimento',
          }),
        },
      }),
    });
  });

  it('keeps a trimmed free-text note together with the reason', async () => {
    await handler.execute(
      new CancelOrderByProviderCommand(1n, 42n, {
        reason: 'OTHER',
        note: '  Estarei viajando  ',
      }),
    );
    const { data } = db.order.update.mock.calls[0][0];
    expect(data.cancellationNote).toBe('Estarei viajando');
    expect(data.orderTimeline.create.description).toBe(
      'Outro motivo: Estarei viajando',
    );
  });

  it('requires a reason', async () => {
    await expect(
      handler.execute(new CancelOrderByProviderCommand(1n, 42n, {} as any)),
    ).rejects.toThrow(BadRequestException);
    expect(db.order.findUnique).not.toHaveBeenCalled();
  });

  it('rejects other providers, missing orders and closed orders', async () => {
    const command = new CancelOrderByProviderCommand(1n, 7n, {
      reason: 'NO_AVAILABILITY',
    });
    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    order.service.providerId = 7n;
    order.status = 'CONCLUIDO';
    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    db.order.findUnique.mockResolvedValueOnce(null);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(db.order.update).not.toHaveBeenCalled();
  });

  it('cancels an existing payment before cancelling the order', async () => {
    order.status = 'AGUARDANDO_PAGAMENTO';
    order.payment = { id: 5n, status: 'PENDENTE' };
    await handler.execute(
      new CancelOrderByProviderCommand(1n, 42n, {
        reason: 'SERVICE_NOT_OFFERED',
      }),
    );
    expect(payments.cancelPayment).toHaveBeenCalledWith(order.payment);
    expect(db.order.update).toHaveBeenCalledTimes(1);
  });
});

describe('Cancel order by provider notifications', () => {
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
    await handler.execute(
      new CancelOrderByProviderCommand(1n, 42n, {
        reason: 'NO_AVAILABILITY',
      } as any),
    );

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

    await handler.execute(
      new CancelOrderByProviderCommand(1n, 42n, {
        reason: 'NO_AVAILABILITY',
      } as any),
    );

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
      handler.execute(
        new CancelOrderByProviderCommand(1n, 42n, {
          reason: 'NO_AVAILABILITY',
        } as any),
      ),
    ).rejects.toThrow('gateway timeout');
    expect(db.order.update).not.toHaveBeenCalled();
    expect(
      notifications.notifyClientOrderCanceledByProvider,
    ).not.toHaveBeenCalled();
  });
});
