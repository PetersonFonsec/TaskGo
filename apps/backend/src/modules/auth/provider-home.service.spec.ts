import { OrderStatus, PaymentStatus } from '@prisma/client';

import { ProviderHomeService } from './provider-home.service';

describe('ProviderHomeService', () => {
  it('builds the provider dashboard from orders and reviews', async () => {
    const now = new Date();
    const prisma = {
      provider: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ratingAvg: 4.8, ratingCount: 12 }),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 10n,
            status: OrderStatus.CONCLUIDO,
            finalPrice: 200,
            requestedAt: now,
            scheduledFor: now,
            client: { name: 'Maria' },
            service: { title: 'Elétrica' },
            payment: {
              amount: 200,
              providerAmount: 180,
              status: PaymentStatus.RELEASED,
              paidAt: now,
            },
            addressSnap: {
              neighborhood: 'Centro',
              city: 'São Paulo',
              state: 'SP',
            },
            review: { rating: 5 },
          },
          {
            id: 11n,
            status: OrderStatus.AGUARDANDO_APROVACAO,
            finalPrice: 120,
            requestedAt: now,
            scheduledFor: now,
            client: { name: 'Carlos' },
            service: { title: 'Elétrica' },
            payment: {
              amount: 120,
              providerAmount: null,
              status: PaymentStatus.CREATED,
              paidAt: null,
            },
            addressSnap: {
              neighborhood: null,
              city: 'Santo André',
              state: 'SP',
            },
            review: null,
          },
          {
            id: 12n,
            status: OrderStatus.EM_ANDAMENTO,
            finalPrice: 150,
            requestedAt: now,
            scheduledFor: now,
            client: { name: 'Ana' },
            service: { title: 'Hidráulica' },
            payment: {
              amount: 150,
              providerAmount: null,
              status: PaymentStatus.AUTHORIZED,
              paidAt: null,
            },
            addressSnap: null,
            review: null,
          },
        ]),
      },
    };

    const result = await new ProviderHomeService(prisma as any).getForProvider(
      7n,
    );

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { service: { is: { providerId: 7n } } },
      }),
    );
    expect(result.earnings.today).toBe(180);
    expect(result.earnings.month).toBe(180);
    expect(result.services).toEqual({
      completedTotal: 1,
      completedThisWeek: 1,
    });
    expect(result.rating).toEqual({ average: 4.8, count: 12 });
    expect(result.pendingRequests[0]).toEqual(
      expect.objectContaining({
        id: '11',
        clientName: 'Carlos',
        address: 'Santo André - SP',
        amount: 120,
      }),
    );
    expect(result.recentServices[0]).toEqual(
      expect.objectContaining({
        id: '10',
        amount: 180,
        rating: 5,
      }),
    );
    expect(result.activeOrders[0]).toEqual(expect.objectContaining({
      id: '12',
      status: OrderStatus.EM_ANDAMENTO,
      clientName: 'Ana',
    }));
    expect(result.insights).toEqual(
      expect.objectContaining({
        mostRequestedService: 'Elétrica',
        averageTicket: 200,
        mostServedNeighborhood: 'Centro',
      }),
    );
  });

  it('returns a complete empty dashboard for a provider without activity', async () => {
    const prisma = {
      provider: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ratingAvg: 0, ratingCount: 0 }),
      },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const result = await new ProviderHomeService(prisma as any).getForProvider(
      8n,
    );

    expect(result.earnings.today).toBe(0);
    expect(result.earnings.lastSixMonths).toHaveLength(6);
    expect(result.pendingRequests).toEqual([]);
    expect(result.activeOrders).toEqual([]);
    expect(result.recentServices).toEqual([]);
    expect(result.insights.averageTicket).toBe(0);
  });
});
