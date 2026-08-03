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
  };
  let prisma: any;
  let providerService: { getAvailability: jest.Mock };
  let handler: CreateOrderHandler;

  beforeEach(() => {
    prisma = {
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
        clientId: '7',
        serviceId: '101',
        scheduledFor: '2026-06-22T12:00:00.000Z',
        paymentMethod: 'PIX',
      }),
    );

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
          clientId: '7',
          serviceId: '101',
          scheduledFor: 'invalid-date',
        }),
      ),
    ).rejects.toThrow('Invalid scheduledFor');
    expect(providerService.getAvailability).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a slot that is no longer available', async () => {
    providerService.getAvailability.mockResolvedValue({ days: [] });

    await expect(
      handler.execute(
        new CreateOrderCommand({
          clientId: '7',
          serviceId: '101',
          scheduledFor: '2026-06-22T12:00:00.000Z',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
