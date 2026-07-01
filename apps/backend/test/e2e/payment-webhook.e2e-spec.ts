import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus, ServiceStatus, UserType } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: webhook de pagamentos Pagar.me', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let paymentId: bigint;
  const chargeId = 'ch_webhook_e2e';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanScenario();
    const client = await prisma.user.create({ data: { name: 'Cliente Webhook', email: 'webhook.client@taskgo.test',
      passwordHash: 'not-used', cpf: '52998224725', type: UserType.CLIENTE } });
    const provider = await prisma.provider.create({ data: { pagarmeRecipientId: 'rp_webhook', user: { create: {
      name: 'Prestador Webhook', email: 'webhook.provider@taskgo.test', passwordHash: 'not-used',
      cpf: '11144477735', type: UserType.PRESTADOR,
    } } } });
    const service = await prisma.service.create({ data: { providerId: provider.id, title: 'Serviço Webhook',
      category: 'reparo', basePrice: 100, status: ServiceStatus.ATIVO } });
    const order = await prisma.order.create({ data: { clientId: client.id, serviceId: service.id,
      status: OrderStatus.AGENDADO, finalPrice: 100, payment: { create: { method: PaymentMethod.PIX,
        status: PaymentStatus.PENDENTE, amount: 100, providerChargeId: chargeId } } }, include: { payment: true } });
    paymentId = order.payment!.id;
  });

  afterAll(async () => { if (prisma) await cleanScenario(); if (app) await app.close(); });

  it.each([
    ['charge.paid', PaymentStatus.PAGO, 'paidAt'],
    ['charge.canceled', PaymentStatus.CANCELADO, 'canceledAt'],
    ['charge.refunded', PaymentStatus.REEMBOLSADO, 'refundedAt'],
  ])('Scenario: Given evento %s, When webhook processar, Then atualiza para %s', async (type, status, dateField) => {
    await sendWebhook({ id: `evt_${status}`, type, data: { id: chargeId } }).expect(200);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe(status);
    expect((payment as any)[dateField]).toBeInstanceOf(Date);
  });

  it('Scenario: Given charge.payment_failed, When processar, Then salva motivo da falha', async () => {
    await sendWebhook({ id: 'evt_failed', type: 'charge.payment_failed', data: { id: chargeId,
      last_transaction: { gateway_response: { errors: [{ message: 'Saldo insuficiente' }] } } } }).expect(200);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe(PaymentStatus.FALHOU);
    expect(payment.failureReason).toBe('Saldo insuficiente');
  });

  it('Scenario: Given evento já processado, When webhook repetir, Then permanece idempotente', async () => {
    const payload = { id: 'evt_duplicate', type: 'charge.paid', data: { id: chargeId } };
    await sendWebhook(payload).expect(200);
    await sendWebhook(payload).expect(200);
    expect(await prisma.paymentWebhookEvent.count({ where: { id: payload.id } })).toBe(1);
  });

  it('Scenario: Given evento desconhecido, When processar, Then registra sem alterar pagamento', async () => {
    await sendWebhook({ id: 'evt_unknown', type: 'charge.updated', data: { id: chargeId } }).expect(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe(PaymentStatus.PENDENTE);
    expect(await prisma.paymentWebhookEvent.count({ where: { id: 'evt_unknown' } })).toBe(1);
  });

  it('Scenario: Given payload sem id e tipo, When processar, Then retorna 400', async () => {
    await sendWebhook({ data: { id: chargeId } }).expect(400);
    expect(await prisma.paymentWebhookEvent.count()).toBe(0);
  });

  function sendWebhook(payload: object) {
    return request(app.getHttpServer()).post('/payments/webhook/pagarme').send(payload);
  }

  async function cleanScenario() {
    await prisma.paymentWebhookEvent.deleteMany({ where: { id: { startsWith: 'evt_' } } });
    const users = await prisma.user.findMany({ where: { email: { startsWith: 'webhook.' } }, select: { id: true } });
    const ids = users.map(({ id }) => id); if (!ids.length) return;
    await prisma.order.deleteMany({ where: { OR: [{ clientId: { in: ids } }, { service: { providerId: { in: ids } } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
