import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ServiceStatus } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

const clientEmail = 'e2e.client.booking@taskgo.test';
const providerEmail = 'e2e.provider.booking@taskgo.test';
const password = 'password123';

const address = {
  label: 'Principal',
  street: 'Rua dos Testes',
  number: '100',
  city: 'Sao Bernardo do Campo',
  state: 'SP',
  cep: '09710000',
  lat: -23.6914,
  lng: -46.5646,
  isDefault: true,
};

function nextMondayAtNine(): { date: string; startsAt: string } {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + ((8 - date.getUTCDay()) % 7 || 7));
  const dateOnly = date.toISOString().slice(0, 10);

  return { date: dateOnly, startsAt: `${dateOnly}T12:00:00.000Z` };
}

describe('Customer booking journey E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let serviceId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await removeJourneyData();

    const seedProvider = await prisma.provider.findFirstOrThrow();
    const service = await prisma.service.create({
      data: {
        providerId: seedProvider.id,
        title: 'Faxina E2E',
        description: 'Servico exclusivo do fluxo E2E',
        category: 'limpeza',
        basePrice: 150,
        status: ServiceStatus.ATIVO,
        availability: {
          timezone: 'America/Sao_Paulo',
          weekdays: {
            monday: [{ start: '09:00', end: '12:00', slotMinutes: 60 }],
          },
        },
      },
    });
    serviceId = service.id.toString();
  });

  afterAll(async () => {
    if (prisma) await removeJourneyData();
    if (app) await app.close();
  });

  async function removeJourneyData() {
    const users = await prisma.user.findMany({
      where: { email: { in: [clientEmail, providerEmail] } },
      select: { id: true },
    });
    const ids = users.map(({ id }) => id);
    if (ids.length === 0) return;

    await prisma.order.deleteMany({
      where: {
        OR: [
          { clientId: { in: ids } },
          { service: { providerId: { in: ids } } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  it('registers both roles, logs in, discovers a provider and requests a booking', async () => {
    const providerRegistration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Prestador E2E',
        email: providerEmail,
        password,
        cpf: '52998224725',
        phone: '11922223333',
        type: 'PRESTADOR',
        bio: 'Especialista em limpeza residencial',
        address,
        services: [serviceId],
      })
      .expect(201);

    expect(providerRegistration.body.user.type).toBe('PRESTADOR');
    expect(providerRegistration.body.access_token).toEqual(expect.any(String));

    const clientRegistration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Cliente E2E',
        email: clientEmail,
        password,
        cpf: '11144477735',
        phone: '11911112222',
        type: 'CLIENTE',
        address,
      })
      .expect(201);

    expect(clientRegistration.body.user.type).toBe('CLIENTE');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: providerEmail, password })
      .expect(201)
      .expect(({ body }) => {
        expect(body.user.type).toBe('PRESTADOR');
        expect(body.access_token).toEqual(expect.any(String));
      });

    const clientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: clientEmail, password })
      .expect(201);

    const providerId = providerRegistration.body.user.id;
    const providers = await request(app.getHttpServer())
      .get('/provider/by-category/limpeza')
      .expect(200);

    expect(providers.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: providerId,
          user: expect.objectContaining({ email: providerEmail }),
          services: expect.arrayContaining([
            expect.objectContaining({ id: serviceId, category: 'limpeza' }),
          ]),
        }),
      ]),
    );

    const slot = nextMondayAtNine();
    const availability = await request(app.getHttpServer())
      .get(`/provider/${providerId}/availability`)
      .query({ from: slot.date, to: slot.date, serviceId })
      .expect(200);

    expect(availability.body.days[0].slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceId, startsAt: slot.startsAt }),
      ]),
    );

    const booking = await request(app.getHttpServer())
      .post('/order')
      .set('Authorization', `Bearer ${clientLogin.body.access_token}`)
      .send({
        clientId: clientLogin.body.user.id,
        serviceId,
        scheduledFor: slot.startsAt,
        finalPrice: 150,
        paymentMethod: 'PIX',
        address: {
          street: address.street,
          number: address.number,
          city: address.city,
          state: address.state,
          cep: address.cep,
          lat: address.lat,
          lng: address.lng,
        },
      })
      .expect(201);

    expect(booking.body).toEqual(
      expect.objectContaining({
        clientId: clientLogin.body.user.id,
        serviceId,
        status: 'PENDENTE',
        scheduledFor: slot.startsAt,
        payment: expect.objectContaining({ method: 'PIX', status: 'PENDENTE' }),
      }),
    );
  });
});
