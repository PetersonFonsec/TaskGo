import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CreateOrderHandler } from './create-order.handler';
import { CreateOrderCommand } from './create-order.command';
import { ProviderService } from '../../../provider/provider.service';
import { providerCoverageWhere } from '../../../provider/coverage';

const databaseUrl = process.env.PROXI_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('Isolated PostgreSQL booking and geographic integrity', () => {
  let db: PrismaClient;
  let providerId: bigint;
  let clientId: bigint;
  let addressId: bigint;
  let serviceIds: bigint[];
  let scheduledFor: string;
  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/proxi_verify'
    )
      throw new Error(
        'Integration tests require the explicit isolated proxi_verify database',
      );
    db = new PrismaClient({ datasources: { db: { url: databaseUrl! } } });
    const suffix = randomUUID();
    const provider = await db.user.create({
      data: {
        name: 'Isolated provider',
        email: `${suffix}-p@example.invalid`,
        cpf: `${suffix}-p`,
        passwordHash: 'test-only',
        type: 'PRESTADOR',
        provider: {
          create: {
            status: 'APPROVED',
            verified: true,
            acceptPix: true,
            serviceAreas: {
              create: {
                mode: 'RADIUS',
                centerLat: 0,
                centerLng: 0,
                radiusKm: 10,
              },
            },
          },
        },
      },
    });
    providerId = provider.id;
    const client = await db.user.create({
      data: {
        name: 'Isolated client',
        email: `${suffix}-c@example.invalid`,
        cpf: `${suffix}-c`,
        passwordHash: 'test-only',
        type: 'CLIENTE',
        addresses: {
          create: {
            street: 'Test',
            number: '1',
            city: 'Test',
            state: 'SP',
            cep: '01001000',
            lat: 0,
            lng: 0,
          },
        },
      },
      include: { addresses: true },
    });
    clientId = client.id;
    addressId = client.addresses[0].id;
    const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    scheduledFor = `${date}T12:00:00.000Z`;
    const weekdays = Object.fromEntries(
      [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ].map((day) => [
        day,
        [{ start: '09:00', end: '11:00', slotMinutes: 60 }],
      ]),
    );
    const services = await Promise.all(
      ['A', 'B'].map((title) =>
        db.service.create({
          data: {
            providerId,
            title,
            category: 'test',
            basePrice: 150,
            availability: { weekdays },
            status: 'ATIVO',
          },
        }),
      ),
    );
    serviceIds = services.map((service) => service.id);
  });
  afterAll(async () => {
    if (db) await db.$disconnect();
  });

  it('allows only one simultaneous reservation across two services of the same provider', async () => {
    const handler = new CreateOrderHandler(
      db as any,
      new ProviderService(db as any),
    );
    const results = await Promise.allSettled(
      serviceIds.map((serviceId) =>
        handler.execute(
          new CreateOrderCommand({
            clientId: String(clientId),
            addressId: String(addressId),
            serviceId: String(serviceId),
            scheduledFor,
            paymentMethod: 'PIX',
            finalPrice: 0.01,
          }),
        ),
      ),
    );
    if (results.every((result) => result.status === 'rejected')) {
      throw new Error(
        results
          .map((result) => (result as PromiseRejectedResult).reason.message)
          .join(' | '),
      );
    }
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejection = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejection.reason.message).toContain('no longer available');
    const orders = await db.order.findMany({
      where: { clientId },
      include: { payment: true, orderTimeline: true },
    });
    expect(orders).toHaveLength(1);
    expect(Number(orders[0].finalPrice)).toBe(150);
    expect(Number(orders[0].payment!.amount)).toBe(150);
    expect(
      orders[0].scheduledEnd!.getTime() - orders[0].scheduledFor!.getTime(),
    ).toBe(3600000);
    expect(orders[0].orderTimeline).toHaveLength(1);
  });

  it('executes the parameterized coverage query across the actual radius boundary', async () => {
    const degreesPerKm = 180 / (Math.PI * 6371);
    const inside = await providerCoverageWhere(db as any, {
      lat: 9.999 * degreesPerKm,
      lng: 0,
    });
    const outside = await providerCoverageWhere(db as any, {
      lat: 10.001 * degreesPerKm,
      lng: 0,
    });
    expect((inside.id as any).in).toContain(providerId);
    expect((outside.id as any).in).not.toContain(providerId);
    await db.providerServiceArea.updateMany({
      where: { providerId },
      data: { active: false },
    });
    const disabled = await providerCoverageWhere(db as any, { lat: 0, lng: 0 });
    expect((disabled.id as any).in).not.toContain(providerId);
  });
});
