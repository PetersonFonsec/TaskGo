import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus, ServiceStatus, UserType } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthTokenService } from '../../src/modules/auth/auth-token.service';
import { PagarmeService } from '../../src/modules/payments/pagarme.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: ciclo de vida completo do pedido', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: AuthTokenService;
  let clientId: bigint;
  let otherClientId: bigint;
  let providerId: bigint;
  let otherProviderId: bigint;
  let serviceId: bigint;
  let orderId: bigint;
  let clientToken: string;
  let otherClientToken: string;
  let providerToken: string;
  let otherProviderToken: string;

  const gateway = {
    createPixPayment: jest.fn(), authorizeCardPayment: jest.fn(), capturePayment: jest.fn(),
    cancelPayment: jest.fn(), refundPayment: jest.fn(), getCharge: jest.fn(), handleWebhook: jest.fn(),
    simulated: true,
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PagarmeService).useValue(gateway).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(AuthTokenService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanScenario();
    const client = await createUser('lifecycle.client@taskgo.test', '52998224725', UserType.CLIENTE);
    const otherClient = await createUser('lifecycle.other-client@taskgo.test', '11144477735', UserType.CLIENTE);
    const provider = await createProvider('lifecycle.provider@taskgo.test', '39053344705');
    const otherProvider = await createProvider('lifecycle.other-provider@taskgo.test', '16899535009');
    const service = await prisma.service.create({ data: { providerId: provider.id, title: 'Elétrica E2E',
      category: 'reparo', basePrice: 120, platformFeePct: 0.12, status: ServiceStatus.ATIVO } });
    const order = await prisma.order.create({ data: { clientId: client.id, serviceId: service.id,
      status: OrderStatus.AGUARDANDO_APROVACAO, estimatedPrice: 120, finalPrice: 120,
      payment: { create: { method: PaymentMethod.CARTAO, status: PaymentStatus.CREATED, amount: 120 } } } });

    clientId = client.id; otherClientId = otherClient.id; providerId = provider.id;
    otherProviderId = otherProvider.id; serviceId = service.id; orderId = order.id;
    clientToken = await tokenFor(clientId); otherClientToken = await tokenFor(otherClientId);
    providerToken = await tokenFor(providerId); otherProviderToken = await tokenFor(otherProviderId);
    gateway.authorizeCardPayment.mockResolvedValue({ orderId: 'or_lifecycle', chargeId: 'ch_lifecycle',
      status: 'authorized_pending_capture', qrCode: null, qrCodeBase64: null, expiresAt: null, raw: { simulated: true } });
    gateway.capturePayment.mockResolvedValue({ id: 'ch_lifecycle', status: 'paid' });
  });

  afterAll(async () => { if (prisma) await cleanScenario(); if (app) await app.close(); });

  describe('Scenario: aceite do pedido', () => {
    it('Given pedido aguardando aprovação, When prestador responsável aceita, Then aguarda pagamento', async () => {
      const response = await post(`/orders/${orderId}/provider/${providerId}/confirm`, providerToken).expect(201);
      expect(response.body.status).toBe(OrderStatus.AGUARDANDO_PAGAMENTO);
    });

    it('Given pedido de outro prestador, When tentar aceitar, Then retorna 403', async () => {
      await post(`/orders/${orderId}/provider/${otherProviderId}/confirm`, otherProviderToken).expect(403);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(OrderStatus.AGUARDANDO_APROVACAO);
    });

    it('Given pedido já aceito, When aceitar novamente, Then retorna 400', async () => {
      await post(`/orders/${orderId}/provider/${providerId}/confirm`, providerToken).expect(201);
      await post(`/orders/${orderId}/provider/${providerId}/confirm`, providerToken).expect(400);
    });
  });

  describe('Scenario: finalização pelo prestador', () => {
    it('Given pedido que não está em andamento, When finalizar, Then retorna 400', async () => {
      await patch(`/orders/${orderId}/finish`, providerToken, finishPayload()).expect(400);
    });

    it('Given pedido em andamento, When outro prestador finalizar, Then retorna 403', async () => {
      await setStatus(OrderStatus.EM_ANDAMENTO);
      await patch(`/orders/${orderId}/finish`, otherProviderToken, finishPayload()).expect(403);
    });

    it('Given pedido em andamento, When responsável finalizar, Then aguarda confirmação e salva evidências', async () => {
      await setStatus(OrderStatus.EM_ANDAMENTO);
      const response = await patch(`/orders/${orderId}/finish`, providerToken, finishPayload()).expect(200);
      expect(response.body.status).toBe(OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE);
      const saved = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: {
        completion: true, orderPhoto: true, orderTimeline: true,
      } });
      expect(saved.completion?.providerNotes).toBe('Serviço concluído com sucesso');
      expect(saved.orderPhoto).toHaveLength(1);
      expect(saved.orderTimeline.some(({ event }) => event === 'SERVICE_FINISHED')).toBe(true);
    });

    it('Given preço alterado sem justificativa, When finalizar, Then retorna 400 e não muda status', async () => {
      await setStatus(OrderStatus.EM_ANDAMENTO);
      await patch(`/orders/${orderId}/finish`, providerToken, { ...finishPayload(), finalPrice: 150,
        priceAdjustmentReason: undefined }).expect(400);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(OrderStatus.EM_ANDAMENTO);
    });
  });

  describe('Scenario: confirmação pelo cliente', () => {
    it('Given serviço não finalizado, When cliente confirmar, Then retorna 400', async () => {
      await patch(`/orders/${orderId}/confirm`, clientToken, {}).expect(400);
    });

    it('Given cartão autorizado e serviço finalizado, When dono confirmar, Then captura e conclui', async () => {
      await prepareFinishedCardOrder();
      const response = await patch(`/orders/${orderId}/confirm`, clientToken, {}).expect(200);
      expect(response.body.status).toBe(OrderStatus.CONCLUIDO);
      expect(response.body.payment.status).toBe(PaymentStatus.PAGO);
      expect(gateway.capturePayment).toHaveBeenCalledWith('ch_lifecycle', 120);
    });

    it('Given serviço finalizado, When outro cliente confirmar, Then retorna 403', async () => {
      await prepareFinishedCardOrder();
      await patch(`/orders/${orderId}/confirm`, otherClientToken, {}).expect(403);
    });

    it('Given PIX ainda pendente, When cliente confirmar, Then retorna 400', async () => {
      await prisma.order.update({ where: { id: orderId }, data: {
        status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE, providerFinishedAt: new Date(),
        payment: { update: { method: PaymentMethod.PIX, status: PaymentStatus.PENDENTE } },
      } });
      const response = await patch(`/orders/${orderId}/confirm`, clientToken, {}).expect(400);
      expect(response.body.message).toBe('Pagamento ainda não confirmado');
    });
  });

  describe('Scenario: avaliação e reputação', () => {
    it('Given pedido não concluído, When avaliar, Then retorna 400', async () => {
      await post(`/orders/${orderId}/review`, clientToken, { rating: 5 }).expect(400);
    });

    it('Given pedido concluído, When dono avalia com tag ativa, Then atualiza reputação', async () => {
      await prepareConcludedOrder();
      const tag = await prisma.reviewTag.findFirstOrThrow({ where: { isActive: true } });
      const response = await post(`/orders/${orderId}/review`, clientToken, {
        rating: 5, comment: 'Excelente serviço', tagIds: [tag.id.toString()],
      }).expect(201);
      expect(response.body.tags).toEqual([expect.objectContaining({ id: tag.id.toString() })]);
      expect(response.body.provider).toEqual(expect.objectContaining({ ratingAvg: 5, ratingCount: 1 }));
    });

    it('Given pedido já avaliado, When avaliar novamente, Then retorna 409', async () => {
      await prepareConcludedOrder();
      await post(`/orders/${orderId}/review`, clientToken, { rating: 4 }).expect(201);
      await post(`/orders/${orderId}/review`, clientToken, { rating: 5 }).expect(409);
    });

    it('Given pedido concluído, When outro cliente avalia, Then retorna 403', async () => {
      await prepareConcludedOrder();
      await post(`/orders/${orderId}/review`, otherClientToken, { rating: 5 }).expect(403);
    });
  });

  async function prepareFinishedCardOrder() {
    await prisma.order.update({ where: { id: orderId }, data: {
      status: OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE, providerFinishedAt: new Date(),
      payment: { update: { method: PaymentMethod.CARTAO, status: PaymentStatus.AUTORIZADO,
        providerChargeId: 'ch_lifecycle', authorizedAt: new Date() } },
    } });
  }

  async function prepareConcludedOrder() {
    await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CONCLUIDO } });
  }

  async function setStatus(status: OrderStatus) { await prisma.order.update({ where: { id: orderId }, data: { status } }); }
  function finishPayload() { return { finalPrice: 120, providerNotes: 'Serviço concluído com sucesso',
    photos: [{ url: 'https://cdn.example.test/after.jpg', type: 'AFTER' }] }; }
  function post(path: string, token: string, body?: object) { return request(app.getHttpServer()).post(path)
    .set('Authorization', `Bearer ${token}`).send(body ?? {}); }
  function patch(path: string, token: string, body: object) { return request(app.getHttpServer()).patch(path)
    .set('Authorization', `Bearer ${token}`).send(body); }
  async function tokenFor(id: bigint) { return (await tokens.createToken(id)).access_token; }
  function createUser(email: string, cpf: string, type: UserType) { return prisma.user.create({ data: {
    name: email.split('@')[0], email, cpf, type, passwordHash: 'not-used',
  } }); }
  function createProvider(email: string, cpf: string) { return prisma.provider.create({ data: {
    pagarmeRecipientId: `rp_${cpf}`, user: { create: { name: email.split('@')[0], email, cpf,
      type: UserType.PRESTADOR, passwordHash: 'not-used' } },
  } }); }
  async function cleanScenario() {
    const users = await prisma.user.findMany({ where: { email: { startsWith: 'lifecycle.' } }, select: { id: true } });
    const ids = users.map(({ id }) => id); if (!ids.length) return;
    await prisma.order.deleteMany({ where: { OR: [{ clientId: { in: ids } }, { service: { providerId: { in: ids } } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
