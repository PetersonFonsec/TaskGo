import { OrderController } from './order.controller';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

describe('Order authorization', () => {
  let controller: OrderController;
  let commands: any;
  let queries: any;
  let db: any;
  let notifications: { notifyClientProviderOnTheWay: jest.Mock };
  const client = { id: '7', role: 'CLIENTE' } as const;
  const provider = { id: '42', role: 'PRESTADOR' } as const;
  beforeEach(() => {
    commands = { execute: jest.fn() };
    queries = { execute: jest.fn() };
    db = {
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          client: { email: 'cliente@proxi.test', name: 'Cliente' },
          service: { title: 'Pintura' },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderTimeline: { create: jest.fn() },
    };
    db.$transaction = jest.fn((fn) => fn(db));
    notifications = { notifyClientProviderOnTheWay: jest.fn() };
    controller = new OrderController(
      queries,
      commands,
      db,
      notifications as any,
    );
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
    expect(() =>
      controller.cancelByProvider(1n, 99n, provider, {
        reason: 'NO_AVAILABILITY',
      }),
    ).toThrow(ForbiddenException);
  });
  it('forwards the refusal reason to the cancel command', () => {
    controller.cancelByProvider(1n, 42n, provider, {
      reason: 'OTHER',
      note: 'Agenda cheia',
    });
    const command = commands.execute.mock.calls[0][0];
    expect(command.providerId).toBe(42n);
    expect(command.payload).toEqual({ reason: 'OTHER', note: 'Agenda cheia' });
  });
  it('tells the details query who is viewing the order', async () => {
    db.order.findFirst.mockResolvedValue({ id: 1n });
    await controller.findOne(1n, provider);
    await controller.findOne(1n, client);
    expect(queries.execute.mock.calls[0][0].viewer).toBe('PRESTADOR');
    expect(queries.execute.mock.calls[1][0].viewer).toBe('CLIENTE');
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
    expect(notifications.notifyClientProviderOnTheWay).not.toHaveBeenCalled();
  });
  it('tells the client the provider is on the way only after the transition', async () => {
    await expect(controller.onTheWay(1n, provider)).resolves.toEqual({
      id: '1',
      status: 'EM_DESLOCAMENTO',
    });
    expect(notifications.notifyClientProviderOnTheWay).toHaveBeenCalledWith(
      { email: 'cliente@proxi.test', name: 'Cliente' },
      { id: 1n, serviceTitle: 'Pintura' },
    );
    db.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(controller.onTheWay(1n, provider)).rejects.toThrow(
      ForbiddenException,
    );
    expect(notifications.notifyClientProviderOnTheWay).toHaveBeenCalledTimes(1);
  });

  it.each(['AUTHORIZED', 'AUTORIZADO', 'PENDENTE', 'CREATED', 'REEMBOLSADO'])(
    'explains why PIX in %s cannot start a service without recording a transition',
    async (status) => {
      db.order.updateMany.mockResolvedValue({ count: 0 });
      db.order.findFirst.mockResolvedValue({
        status: 'EM_DESLOCAMENTO',
        service: { provider: { status: 'APPROVED' } },
        payment: { method: 'PIX', status },
      });
      await expect(controller.start(12n, provider)).rejects.toThrow(
        'O PIX deste pedido ainda não está confirmado como pago',
      );
      expect(db.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 12n, service: { providerId: 42n } },
        }),
      );
      expect(db.orderTimeline.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['start', 'AGENDADO', 'em deslocamento'],
    ['onTheWay', 'AGUARDANDO_PAGAMENTO', 'agendado'],
  ] as const)(
    'explains the required prior state for %s',
    async (action, status, message) => {
      db.order.updateMany.mockResolvedValue({ count: 0 });
      db.order.findFirst.mockResolvedValue({
        status,
        service: { provider: { status: 'APPROVED' } },
        payment: { method: 'PIX', status: 'PAGO' },
      });
      await expect(controller[action](12n, provider)).rejects.toThrow(message);
      expect(db.orderTimeline.create).not.toHaveBeenCalled();
    },
  );

  it('does not disclose payment information to another provider', async () => {
    db.order.updateMany.mockResolvedValue({ count: 0 });
    db.order.findFirst.mockResolvedValue(null);
    await expect(controller.start(12n, provider)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.orderTimeline.create).not.toHaveBeenCalled();
  });

  it('rejects a provider whose approval was revoked', async () => {
    db.order.updateMany.mockResolvedValue({ count: 0 });
    db.order.findFirst.mockResolvedValue({
      status: 'EM_DESLOCAMENTO',
      service: { provider: { status: 'PENDING' } },
      payment: { method: 'PIX', status: 'PAGO' },
    });
    await expect(controller.start(12n, provider)).rejects.toThrow(
      'precisa estar aprovado',
    );
    expect(db.orderTimeline.create).not.toHaveBeenCalled();
  });

  it('asks for a refresh when the state changes during a rejected transition', async () => {
    db.order.updateMany.mockResolvedValue({ count: 0 });
    db.order.findFirst.mockResolvedValue({
      status: 'EM_DESLOCAMENTO',
      service: { provider: { status: 'APPROVED' } },
      payment: { method: 'PIX', status: 'PAGO' },
    });
    await expect(controller.start(12n, provider)).rejects.toThrow(
      ConflictException,
    );
    expect(db.orderTimeline.create).not.toHaveBeenCalled();
  });
});
