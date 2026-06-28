import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: {
    service: { findUnique: jest.Mock };
    order: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let providerService: { getAvailability: jest.Mock };
  let orders: any[];

  const activeService = {
    id: 101n,
    providerId: 42n,
    status: 'ATIVO',
    basePrice: 150,
  };

  beforeEach(async () => {
    orders = [];
    prisma = {
      service: {
        findUnique: jest.fn().mockResolvedValue(activeService),
      },
      order: {
        create: jest.fn(async ({ data, include }) => {
          const created = {
            id: BigInt(orders.length + 1),
            ...data,
            payment: data.payment?.create,
            addressSnap: data.addressSnap?.create,
          };
          orders.push(created);
          return include ? created : { id: created.id };
        }),
        delete: jest.fn(async ({ where }) => ({ id: where.id })),
        findMany: jest.fn(async ({ where }) =>
          where?.scheduledFor?.equals
            ? orders.filter(
                (order) =>
                  order.serviceId === where.serviceId &&
                  where.status.in.includes(order.status) &&
                  order.scheduledFor?.getTime() ===
                    where.scheduledFor.equals.getTime(),
              )
            : [{ id: 1n }],
        ),
        findUnique: jest.fn(async ({ where, include }) => ({
          id: where.id,
          status: OrderStatus.AGUARDANDO_APROVACAO,
          serviceId: 101n,
          clientId: 7n,
          finalPrice: 150,
          client: { id: 7n },
          service: { id: 101n, providerId: 42n },
          addressSnap: include?.addressSnap ? { id: 1n } : undefined,
        })),
        update: jest.fn(async ({ where, data }) => ({
          id: where.id,
          ...data,
        })),
      },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };
    providerService = {
      getAvailability: jest.fn().mockResolvedValue({
        providerId: '42',
        timezone: 'America/Sao_Paulo',
        days: [
          {
            date: '2026-06-22',
            available: true,
            slots: [
              {
                startsAt: '2026-06-22T12:00:00.000Z',
                endsAt: '2026-06-22T13:00:00.000Z',
                serviceId: '101',
                label: '09:00',
                available: true,
              },
            ],
          },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ProviderService,
          useValue: providerService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an order when scheduledFor matches an available slot', async () => {
    const result = await service.create({
      clientId: '7',
      serviceId: '101',
      scheduledFor: '2026-06-22T12:00:00.000Z',
      paymentMethod: 'PIX',
      address: {
        street: 'Rua A',
        number: '10',
        city: 'Sao Paulo',
        state: 'SP',
      },
    });

    expect(providerService.getAvailability).toHaveBeenCalledWith('42', {
      from: '2026-06-22',
      to: '2026-06-22',
      serviceId: '101',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 7n,
          serviceId: 101n,
          status: OrderStatus.AGUARDANDO_APROVACAO,
          finalPrice: 150,
          scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
          payment: {
            create: {
              method: 'PIX',
              status: PaymentStatus.CREATED,
              amount: 150,
            },
          },
          addressSnap: {
            create: expect.objectContaining({
              street: 'Rua A',
              city: 'Sao Paulo',
            }),
          },
        }),
        include: { payment: true, addressSnap: true },
      }),
    );
    expect(result.scheduledFor).toEqual(new Date('2026-06-22T12:00:00.000Z'));
  });

  it('rejects an order when scheduledFor is unavailable or occupied', async () => {
    providerService.getAvailability.mockResolvedValue({
      providerId: '42',
      timezone: 'America/Sao_Paulo',
      days: [{ date: '2026-06-22', available: false, slots: [] }],
    });

    await expect(
      service.create({
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      }),
    ).rejects.toThrow('Selected scheduled slot is no longer available');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rejects an order when scheduledFor does not exactly match an available slot', async () => {
    await expect(
      service.create({
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:30:00.000Z',
      }),
    ).rejects.toThrow('Selected scheduled slot is no longer available');

    expect(providerService.getAvailability).toHaveBeenCalledWith('42', {
      from: '2026-06-22',
      to: '2026-06-22',
      serviceId: '101',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rejects invalid scheduledFor values before checking availability', async () => {
    await expect(
      service.create({
        clientId: '7',
        serviceId: '101',
        scheduledFor: 'not-a-date',
      }),
    ).rejects.toThrow('Invalid scheduledFor');

    expect(providerService.getAvailability).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps existing unscheduled order behavior when scheduledFor is omitted', async () => {
    const result = await service.create({
      clientId: '7',
      serviceId: '101',
      finalPrice: 125,
    });

    expect(providerService.getAvailability).not.toHaveBeenCalled();
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 7n,
          serviceId: 101n,
          finalPrice: 125,
          scheduledFor: undefined,
          payment: {
            create: {
              method: 'PIX',
              status: PaymentStatus.CREATED,
              amount: 125,
            },
          },
          addressSnap: undefined,
        }),
      }),
    );
    expect(result.scheduledFor).toBeUndefined();
  });

  it('rejects a second order for the same provider service and slot', async () => {
    providerService.getAvailability.mockImplementation(
      async (_providerId, query) => {
        const slot = new Date('2026-06-22T12:00:00.000Z');
        const conflicts = await prisma.order.findMany({
          where: {
            serviceId: BigInt(query.serviceId),
            status: {
              in: [
                OrderStatus.AGUARDANDO_APROVACAO,
                OrderStatus.AGUARDANDO_PAGAMENTO,
                OrderStatus.AGENDADO,
              ],
            },
            scheduledFor: { equals: slot },
          },
        });

        return {
          providerId: '42',
          timezone: 'America/Sao_Paulo',
          days: [
            {
              date: query.from,
              available: conflicts.length === 0,
              slots:
                conflicts.length === 0
                  ? [
                      {
                        startsAt: slot.toISOString(),
                        endsAt: '2026-06-22T13:00:00.000Z',
                        serviceId: query.serviceId,
                        label: '09:00',
                        available: true,
                      },
                    ]
                  : [],
            },
          ],
        };
      },
    );

    await expect(
      service.create({
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 1n }));

    await expect(
      service.create({
        clientId: '8',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      }),
    ).rejects.toThrow('Selected scheduled slot is no longer available');

    expect(providerService.getAvailability).toHaveBeenCalledTimes(2);
    expect(prisma.order.create).toHaveBeenCalledTimes(1);
  });

  it('finds one order by id', async () => {
    await expect(service.findOne(1n)).resolves.toEqual(
      expect.objectContaining({ id: 1n }),
    );

    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: 1n },
    });
  });

  it('returns an order summary with client and service data', async () => {
    await expect(service.getSummary(1n)).resolves.toEqual({
      id: 1n,
      status: OrderStatus.AGUARDANDO_APROVACAO,
      finalPrice: 150,
      client: { id: 7n },
      service: { id: 101n, providerId: 42n },
    });
  });

  it('throws when order summary is missing', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(service.getSummary(404n)).rejects.toThrow('Order not found');
  });

  it('finds orders by client with existing includes', async () => {
    await expect(service.findByClient(7n)).resolves.toEqual([{ id: 1n }]);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 7n },
        orderBy: { requestedAt: 'desc' },
      }),
    );
  });

  it('finds orders by provider through the service owner', async () => {
    await expect(service.findByProvider(42n)).resolves.toEqual([{ id: 1n }]);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          service: {
            is: {
              providerId: 42n,
            },
          },
        },
      }),
    );
  });

  it('normalizes update ids and scheduled dates', async () => {
    await expect(
      service.update(1n, {
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
      } as any),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 1n,
        clientId: 7n,
        serviceId: 101n,
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
      }),
    );
  });

  it('schedules an order', async () => {
    await expect(
      service.schedule(1n, { scheduledFor: '2026-06-22T12:00:00.000Z' }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 1n,
        scheduledFor: new Date('2026-06-22T12:00:00.000Z'),
        status: OrderStatus.AGENDADO,
      }),
    );
  });

  it('removes an order', async () => {
    await expect(service.remove(1n)).resolves.toEqual({ id: 1n });
  });

  it('confirms a pending order when the provider owns the service', async () => {
    await expect(service.confirmByProvider(1n, 42n)).resolves.toEqual({
      id: 1n,
      status: OrderStatus.AGUARDANDO_PAGAMENTO,
    });
  });

  it('rejects provider confirmation for a missing order', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(service.confirmByProvider(404n, 42n)).rejects.toThrow(
      'Order not found',
    );
  });

  it('rejects provider confirmation from a provider that does not own the service', async () => {
    await expect(service.confirmByProvider(1n, 99n)).rejects.toThrow(
      'Provider not allowed to confirm this order',
    );
  });

  it('rejects provider confirmation when the order is not pending', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 1n,
      status: OrderStatus.AGENDADO,
      service: { id: 101n, providerId: 42n },
    });

    await expect(service.confirmByProvider(1n, 42n)).rejects.toThrow(
      'Only AGUARDANDO_APROVACAO orders can be confirmed',
    );
  });

  it('cancels a pending order when the provider owns the service', async () => {
    await expect(service.cancelByProvider(1n, 42n)).resolves.toEqual({
      id: 1n,
      status: OrderStatus.CANCELADO,
    });
  });

  it('rejects provider cancellation for a missing order', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(service.cancelByProvider(404n, 42n)).rejects.toThrow(
      'Order not found',
    );
  });

  it('rejects provider cancellation from a provider that does not own the service', async () => {
    await expect(service.cancelByProvider(1n, 99n)).rejects.toThrow(
      'Provider not allowed to cancel this order',
    );
  });

  it('rejects provider cancellation when the order cannot be cancelled', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 1n,
      status: OrderStatus.CONCLUIDO,
      service: { id: 101n, providerId: 42n },
    });

    await expect(service.cancelByProvider(1n, 42n)).rejects.toThrow(
      'Only orders awaiting approval, awaiting payment, or scheduled can be cancelled by provider',
    );
  });
});
