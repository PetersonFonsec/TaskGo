import { BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { CreateOrderCommand } from './create-order.command';
import { CreateOrderHandler } from './create-order.handler';

describe('CreateOrderHandler', () => {
  const service = {
    id: 101n,
    providerId: 42n,
    status: 'ATIVO',
    basePrice: 150,
    provider: {
      status: 'APPROVED',
      serviceAreas: [
        { mode: 'RADIUS', centerLat: 0, centerLng: 0, radiusKm: 10 },
      ],
    },
  };
  let prisma: any;
  let providerService: { getAvailability: jest.Mock };
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
      order: { create: jest.fn().mockResolvedValue({ id: 1n }) },
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
    handler = new CreateOrderHandler(prisma, providerService as any);
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
  });
});
