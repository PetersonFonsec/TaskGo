import { OrderController } from './order.controller';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('Order authorization', () => {
  let controller: OrderController;
  let commands: any;
  let queries: any;
  let db: any;
  const client = { id: '7', role: 'CLIENTE' } as const;
  const provider = { id: '42', role: 'PRESTADOR' } as const;
  beforeEach(() => {
    commands = { execute: jest.fn() };
    queries = { execute: jest.fn() };
    db = {
      order: {
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderTimeline: { create: jest.fn() },
    };
    db.$transaction = jest.fn((fn) => fn(db));
    controller = new OrderController(queries, commands, db);
  });
  it('rejects anonymous and cross-account list requests', () => {
    expect(() => controller.findByClient(7n, null as any)).toThrow(
      UnauthorizedException,
    );
    expect(() => controller.findByClient(8n, client)).toThrow(
      ForbiddenException,
    );
    expect(() => controller.findByProvider(42n, client)).toThrow(
      ForbiddenException,
    );
    expect(queries.execute).not.toHaveBeenCalled();
  });
  it('denies nonparticipant detail and summary access', async () => {
    await expect(controller.findOne(10n, client)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(controller.getSummary(10n, provider)).rejects.toThrow(
      ForbiddenException,
    );
    expect(queries.execute).not.toHaveBeenCalled();
  });
  it('replaces forged client identity on create', () => {
    controller.create(
      { clientId: '999', serviceId: '1', addressId: '1' },
      client,
    );
    expect(commands.execute.mock.calls[0][0].payload.clientId).toBe('7');
  });
  it('disables arbitrary updates, deletion and rescheduling', () => {
    expect(() => controller.update(1n, {})).toThrow(ForbiddenException);
    expect(() => controller.remove(1n)).toThrow(ForbiddenException);
    expect(() =>
      controller.schedule(1n, { scheduledFor: '2030-01-01' }),
    ).toThrow(ForbiddenException);
  });
  it('rejects forged provider path identity', () => {
    expect(() => controller.confirmByProvider(1n, 99n, provider)).toThrow(
      ForbiddenException,
    );
    expect(() => controller.cancelByProvider(1n, 99n, provider)).toThrow(
      ForbiddenException,
    );
  });
  it('atomically guards lifecycle with ownership, prior state and funded payment', async () => {
    await controller.start(1n, provider);
    expect(db.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 1n,
          status: 'EM_DESLOCAMENTO',
          service: { providerId: 42n, provider: { status: 'APPROVED' } },
          payment: { method: 'PIX', status: { in: ['CAPTURED', 'PAGO'] } },
        }),
      }),
    );
    expect(db.orderTimeline.create).toHaveBeenCalledTimes(1);
    db.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(controller.start(1n, provider)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.orderTimeline.create).toHaveBeenCalledTimes(1);
  });
});
