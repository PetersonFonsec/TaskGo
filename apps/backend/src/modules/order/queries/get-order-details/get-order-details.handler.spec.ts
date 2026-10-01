import { GetOrderDetailsHandler } from './get-order-details.handler';
import { GetOrderDetailsQuery } from './get-order-details.query';

describe('Order details', () => {
  let db: any;
  let config: any;
  let order: any;
  let handler: GetOrderDetailsHandler;
  beforeEach(() => {
    order = {
      id: 1n,
      status: 'AGUARDANDO_APROVACAO',
      requestedAt: new Date('2026-10-01T10:00:00Z'),
      scheduledFor: new Date('2026-10-03T13:00:00Z'),
      scheduledEnd: new Date('2026-10-03T15:00:00Z'),
      estimatedPrice: 150,
      finalPrice: null,
      priceAdjustmentReason: null,
      providerFinishedAt: null,
      cancellationReason: null,
      cancellationNote: null,
      client: { id: 7n, name: 'Ana', photoUrl: null },
      service: {
        id: 3n,
        title: 'Instalação elétrica',
        category: 'eletrica',
        basePrice: 120,
        platformFeePct: null,
        provider: {
          id: 42n,
          ratingAvg: 4.8,
          ratingCount: 10,
          verified: true,
          user: { name: 'Bruno', photoUrl: null },
          serviceAreas: [{ centerLat: -23.55, centerLng: -46.63 }],
        },
      },
      addressSnap: {
        street: 'Rua A',
        number: '10',
        complement: null,
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        cep: '01000-000',
        lat: -23.56,
        lng: -46.64,
      },
      payment: null,
      review: null,
      completion: null,
      orderPhoto: [],
      orderTimeline: [
        {
          event: 'REQUESTED',
          description: null,
          createdAt: new Date('2026-10-01T10:00:00Z'),
        },
      ],
    };
    db = {
      order: { findUnique: jest.fn(async () => order) },
      category: {
        findFirst: jest.fn().mockResolvedValue({ platformFeePct: null }),
      },
    };
    config = { getOrThrow: jest.fn().mockReturnValue(0.12) };
    handler = new GetOrderDetailsHandler(
      db,
      { expiresAt: jest.fn().mockReturnValue(null) } as any,
      config,
    );
  });

  it('shows the provider the net amount after the platform fee and the distance', async () => {
    const details = await handler.execute(
      new GetOrderDetailsQuery(1n, 'PRESTADOR'),
    );
    expect(details.providerEarnings).toEqual({
      grossAmount: 150,
      feePct: 0.12,
      feeAmount: 18,
      netAmount: 132,
    });
    expect(details.distanceKm).toBeCloseTo(1.5, 1);
    expect(details.schedule.scheduledEnd).toEqual(order.scheduledEnd);
  });

  it('prefers the service fee over the default one', async () => {
    order.service.platformFeePct = 0.1;
    const details = await handler.execute(
      new GetOrderDetailsQuery(1n, 'PRESTADOR'),
    );
    expect(details.providerEarnings?.netAmount).toBe(135);
    expect(db.category.findFirst).not.toHaveBeenCalled();
  });

  it('hides earnings, distance, coordinates and contact data from clients', async () => {
    const details = await handler.execute(new GetOrderDetailsQuery(1n));
    expect(details.providerEarnings).toBeNull();
    expect(details.distanceKm).toBeNull();
    expect(details.address).not.toHaveProperty('lat');
    expect(details.address).not.toHaveProperty('lng');
    expect(details.client).not.toHaveProperty('email');
    expect(details.client).not.toHaveProperty('phone');
  });

  it('returns no distance when coordinates are unknown', async () => {
    order.addressSnap.lat = null;
    const details = await handler.execute(
      new GetOrderDetailsQuery(1n, 'PRESTADOR'),
    );
    expect(details.distanceKm).toBeNull();
  });

  it('exposes the refusal reason of cancelled orders', async () => {
    const canceledAt = new Date('2026-10-01T11:00:00Z');
    order.status = 'CANCELADO';
    order.cancellationReason = 'NO_AVAILABILITY';
    order.cancellationNote = 'Agenda cheia';
    order.orderTimeline.push({
      event: 'CANCELED',
      description: 'Sem horário disponível: Agenda cheia',
      createdAt: canceledAt,
    });
    const details = await handler.execute(new GetOrderDetailsQuery(1n));
    expect(details.cancellation).toEqual({
      reason: 'NO_AVAILABILITY',
      label: 'Sem horário disponível',
      note: 'Agenda cheia',
      canceledAt,
    });
    expect(details.timeline[1].description).toBe(
      'Sem horário disponível: Agenda cheia',
    );
  });
});
