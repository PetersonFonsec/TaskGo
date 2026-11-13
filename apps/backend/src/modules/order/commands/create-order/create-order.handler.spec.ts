import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { CreateOrderCommand } from './create-order.command';
import { CreateOrderHandler } from './create-order.handler';

describe('CreateOrderHandler', () => {
  const service = {
    id: 101n,
    providerId: 42n,
    title: 'Instalação elétrica',
    status: 'ATIVO',
    basePrice: 150,
    provider: {
      status: 'APPROVED',
      user: { email: 'prestador@proxi.test', name: 'Prestador' },
      serviceAreas: [
        { mode: 'RADIUS', centerLat: 0, centerLng: 0, radiusKm: 10 },
      ],
    },
  };
  let prisma: any;
  let providerService: { getAvailability: jest.Mock };
  let notifications: { notifyProviderNewOrder: jest.Mock };
  let handler: CreateOrderHandler;

  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-01').getTime());
    prisma = {
      $queryRaw: jest.fn(),
      address: {
        findFirst: jest.fn().mockResolvedValue({
          street: 'A',
          city: 'B',
          state: 'SP',
          cep: '123',
          lat: 0,
          lng: 0,
        }),
      },
      service: { findUnique: jest.fn().mockResolvedValue(service) },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 1n,
          scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
        }),
      },
      $transaction: jest.fn((operation) => operation(prisma)),
    };
    providerService = {
      getAvailability: jest.fn().mockResolvedValue({
        days: [
          {
            slots: [
              {
                available: true,
                serviceId: '101',
                startsAt: '2026-06-22T12:00:00.000Z',
                endsAt: '2026-06-22T13:00:00.000Z',
              },
            ],
          },
        ],
      }),
    };
    notifications = { notifyProviderNewOrder: jest.fn() };
    handler = new CreateOrderHandler(
      prisma,
      providerService as any,
      notifications as any,
    );
  });

  it('creates the aggregate transactionally when the requested slot is available', async () => {
    await handler.execute(
      new CreateOrderCommand({
        addressId: '1',
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
        paymentMethod: 'PIX',
        finalPrice: 0.01,
      }),
    );

    expect(providerService.getAvailability).toHaveBeenCalledWith(
      '42',
      {
        from: '2026-06-22',
        to: '2026-06-22',
        serviceId: '101',
      },
      prisma,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 7n,
          serviceId: 101n,
          status: OrderStatus.AGUARDANDO_APROVACAO,
          finalPrice: 150,
          payment: {
            create: {
              method: 'PIX',
              status: PaymentStatus.CREATED,
              amount: 150,
            },
          },
        }),
      }),
    );
  });

  it('notifies the provider about the new request after the commit', async () => {
    await handler.execute(
      new CreateOrderCommand({
        addressId: '1',
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      }),
    );

    expect(notifications.notifyProviderNewOrder).toHaveBeenCalledWith(
      { email: 'prestador@proxi.test', name: 'Prestador' },
      {
        id: 1n,
        serviceTitle: 'Instalação elétrica',
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      },
    );
    expect(
      notifications.notifyProviderNewOrder.mock.invocationCallOrder[0],
    ).toBeGreaterThan(prisma.order.create.mock.invocationCallOrder[0]);
  });

  it('rejects invalid dates before consulting availability', async () => {
    await expect(
      handler.execute(
        new CreateOrderCommand({
          addressId: '1',
          clientId: '7',
          serviceId: '101',
          scheduledFor: 'invalid-date',
        }),
      ),
    ).rejects.toThrow('Choose a future scheduled slot');
    expect(providerService.getAvailability).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a slot that is no longer available', async () => {
    providerService.getAvailability.mockResolvedValue({ days: [] });

    await expect(
      handler.execute(
        new CreateOrderCommand({
          addressId: '1',
          clientId: '7',
          serviceId: '101',
          scheduledFor: '2026-06-22T12:00:00.000Z',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(notifications.notifyProviderNewOrder).not.toHaveBeenCalled();
  });

  describe('Idempotency-Key', () => {
    const KEY = '0b8a3c1e-6f0d-4d3e-9a51-2f8a1c7b9e10';
    const base = {
      addressId: '1',
      clientId: '7',
      serviceId: '101',
      scheduledFor: '2026-06-22T12:00:00.000Z',
    };
    const command = (
      key: string | null = KEY,
      changes: Partial<
        ConstructorParameters<typeof CreateOrderCommand>[0]
      > = {},
    ) => new CreateOrderCommand({ ...base, ...changes }, key ?? undefined);
    /** Pedido gravado por uma criação real do handler com `changes`. */
    const created = async (changes = {}) => {
      prisma.order.findFirst = jest.fn().mockResolvedValue(null);
      await handler.execute(command(KEY, changes));
      const { data } = prisma.order.create.mock.calls.at(-1)[0];
      prisma.order.create.mockClear();
      prisma.$transaction.mockClear();
      notifications.notifyProviderNewOrder.mockClear();
      return {
        id: 1n,
        serviceId: 101n,
        scheduledFor: new Date(base.scheduledFor),
        idempotencyFingerprint: data.idempotencyFingerprint,
      };
    };
    const mismatch = expect.objectContaining({
      status: 409,
      response: expect.objectContaining({
        errorCode: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
      }),
    });

    it('stores the key and the intent fingerprint with the new order', async () => {
      const existing = await created();
      expect(existing.idempotencyFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 7n, idempotencyKey: KEY },
        }),
      );
    });

    it('A: returns the original order on an identical repeat, before validating the (now taken) slot', async () => {
      const existing = await created();
      prisma.order.findFirst = jest.fn().mockResolvedValue(existing);
      providerService.getAvailability.mockResolvedValue({ days: [] });
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-23').getTime()); // horário já passou

      await expect(handler.execute(command())).resolves.toBe(existing);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(notifications.notifyProviderNewOrder).not.toHaveBeenCalled();
    });

    it.each([
      ['B: another address', { addressId: '2' }],
      ['C: another service', { serviceId: '102' }],
      ['D: another time', { scheduledFor: '2026-06-22T13:00:00.000Z' }],
      ['E: another payment method', { paymentMethod: 'CARTAO' as const }],
      ['another channel', { channel: 'APP' as const }],
    ])('%s with the same key is a structured 409', async (_, changes) => {
      const existing = await created();
      prisma.order.findFirst = jest.fn().mockResolvedValue(existing);
      await expect(handler.execute(command(KEY, changes))).rejects.toEqual(
        mismatch,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('E: an omitted payment method or channel equals its real default, not another value', async () => {
      const existing = await created();
      prisma.order.findFirst = jest.fn().mockResolvedValue(existing);
      await expect(
        handler.execute(command(KEY, { paymentMethod: 'PIX', channel: 'WEB' })),
      ).resolves.toBe(existing);
      const app = await created({ channel: 'APP' });
      prisma.order.findFirst = jest.fn().mockResolvedValue(app);
      await expect(handler.execute(command())).rejects.toEqual(mismatch);
    });

    it('F: the same instant in another ISO form, and ids with leading zeros, are the same intent', async () => {
      const existing = await created();
      prisma.order.findFirst = jest.fn().mockResolvedValue(existing);
      await expect(
        handler.execute(
          command(KEY, {
            scheduledFor: '2026-06-22T09:00:00-03:00',
            addressId: '01',
          }),
        ),
      ).resolves.toBe(existing);
    });

    it('an order with a key but no recorded fingerprint is never taken as a replay', async () => {
      prisma.order.findFirst = jest.fn().mockResolvedValue({
        id: 1n,
        serviceId: 101n,
        scheduledFor: new Date(base.scheduledFor),
        idempotencyFingerprint: null,
      });
      await expect(handler.execute(command())).rejects.toEqual(mismatch);
    });

    it('returns the order a concurrent identical request created while waiting for the lock', async () => {
      const existing = await created();
      prisma.order.findFirst = jest
        .fn()
        .mockResolvedValueOnce(null) // antes do lock
        .mockResolvedValueOnce(existing); // depois do lock
      await expect(handler.execute(command())).resolves.toBe(existing);
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(notifications.notifyProviderNewOrder).not.toHaveBeenCalled();
    });

    it('G: a concurrent request with the same key and another address, seen under the lock, is a 409', async () => {
      const existing = await created();
      prisma.order.findFirst = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      await expect(
        handler.execute(command(KEY, { addressId: '2' })),
      ).rejects.toEqual(mismatch);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('G: when the unique index refuses a parallel insert, the stored order decides between replay and 409', async () => {
      const existing = await created();
      const unique = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.$transaction.mockRejectedValue(unique);
      prisma.order.findFirst = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(existing);
      await expect(handler.execute(command())).resolves.toBe(existing);
      await expect(
        handler.execute(command(KEY, { addressId: '2' })),
      ).rejects.toEqual(mismatch);
      expect(notifications.notifyProviderNewOrder).not.toHaveBeenCalled();
      // Sem chave, a violação não é tratada como repetição.
      await expect(handler.execute(command(null))).rejects.toBe(unique);
    });

    it('H: rejects malformed keys and keeps requests without a key unchanged', async () => {
      prisma.order.findFirst = jest.fn();
      await expect(handler.execute(command('short'))).rejects.toThrow(
        'Invalid Idempotency-Key',
      );
      await handler.execute(command(null));
      expect(prisma.order.findFirst).not.toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idempotencyKey: null,
            idempotencyFingerprint: null,
          }),
        }),
      );
    });
  });
});
