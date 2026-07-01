import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentMethod, PaymentStatus, ServiceStatus, UserType } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AuthTokenService } from '../../src/modules/auth/auth-token.service';
import { PagarmeService } from '../../src/modules/payments/pagarme.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Feature: pagamento de pedidos', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: AuthTokenService;
  let clientId: bigint;
  let otherClientId: bigint;
  let providerId: bigint;
  let serviceId: bigint;
  let orderId: bigint;
  let clientToken: string;
  let otherClientToken: string;

  const gateway = {
    createPixPayment: jest.fn(),
    authorizeCardPayment: jest.fn(),
    capturePayment: jest.fn(),
    cancelPayment: jest.fn(),
    refundPayment: jest.fn(),
    getCharge: jest.fn(),
    handleWebhook: jest.fn(),
    simulated: true,
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PagarmeService)
      .useValue(gateway)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(AuthTokenService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanScenario();

    const client = await prisma.user.create({ data: {
      name: 'Cliente Pagamento E2E', email: 'payment.client@taskgo.test', passwordHash: 'not-used',
      cpf: '52998224725', type: UserType.CLIENTE,
    } });
    const otherClient = await prisma.user.create({ data: {
      name: 'Outro Cliente E2E', email: 'payment.other@taskgo.test', passwordHash: 'not-used',
      cpf: '11144477735', type: UserType.CLIENTE,
    } });
    const provider = await prisma.provider.create({ data: {
      pagarmeRecipientId: 'rp_e2e_provider',
      user: { create: { name: 'Prestador Pagamento E2E', email: 'payment.provider@taskgo.test',
        passwordHash: 'not-used', cpf: '39053344705', type: UserType.PRESTADOR } },
    } });
    const service = await prisma.service.create({ data: {
      providerId: provider.id, title: 'Serviço Pagamento E2E', category: 'reparo', basePrice: 100,
      platformFeePct: 0.12, status: ServiceStatus.ATIVO,
    } });
    const order = await prisma.order.create({ data: {
      clientId: client.id, serviceId: service.id, status: OrderStatus.AGUARDANDO_PAGAMENTO,
      finalPrice: 120,
      payment: { create: { method: PaymentMethod.PIX, status: PaymentStatus.CREATED, amount: 120 } },
    } });

    clientId = client.id; otherClientId = otherClient.id; providerId = provider.id;
    serviceId = service.id; orderId = order.id;
    clientToken = (await tokens.createToken(clientId)).access_token;
    otherClientToken = (await tokens.createToken(otherClientId)).access_token;
    gateway.createPixPayment.mockResolvedValue({ orderId: 'or_e2e_pix', chargeId: 'ch_e2e_pix',
      status: 'pending', qrCode: 'pix-copy-paste', qrCodeBase64: null,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'), raw: { simulated: true } });
    gateway.authorizeCardPayment.mockResolvedValue({ orderId: 'or_e2e_card', chargeId: 'ch_e2e_card',
      status: 'authorized_pending_capture', qrCode: null, qrCodeBase64: null,
      expiresAt: null, raw: { simulated: true } });
  });

  afterAll(async () => {
    if (prisma) await cleanScenario();
    if (app) await app.close();
  });

  describe('Scenario: autenticação obrigatória', () => {
    it('Given uma requisição anônima, When iniciar PIX, Then retorna 401', async () => {
      await request(app.getHttpServer()).post(`/orders/${orderId}/payment`).send({ method: 'PIX' }).expect(401);
      expect(gateway.createPixPayment).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: validação do payload', () => {
    it.each([
      ['método ausente', {}, 400],
      ['método não suportado', { method: 'OUTRO' }, 400],
      ['cartão sem dados', { method: 'CARTAO' }, 400],
      ['PIX com cartão', { method: 'PIX', card: validCard() }, 400],
      ['cartão inválido', { method: 'CARTAO', card: { ...validCard(), cvv: '1' } }, 400],
    ])('Given %s, When iniciar pagamento, Then rejeita a requisição', async (_, payload, status) => {
      await postPayment(orderId, clientToken, payload).expect(status);
    });
  });

  describe('Scenario: pedido precisa existir e pertencer ao cliente', () => {
    it('Given pedido inexistente, When pagar, Then retorna 404', async () => {
      await postPayment(999999n, clientToken, { method: 'PIX' }).expect(404);
    });

    it('Given outro cliente, When pagar o pedido, Then retorna 403', async () => {
      await postPayment(orderId, otherClientToken, { method: 'PIX' }).expect(403);
    });
  });

  describe('Scenario: estado do pedido', () => {
    it('Given pedido fora de AGENDADO/AGUARDANDO_PAGAMENTO, When pagar, Then retorna 400', async () => {
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.EM_ANDAMENTO } });
      await postPayment(orderId, clientToken, { method: 'PIX' }).expect(400);
    });
  });

  describe('Scenario: habilitação financeira do prestador', () => {
    it('Given prestador sem recipientId, When pagar, Then retorna 400 e não chama gateway', async () => {
      await prisma.provider.update({ where: { id: providerId }, data: { pagarmeRecipientId: null } });
      const response = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(400);
      expect(response.body.message).toBe('Prestador ainda não está habilitado para receber pagamentos');
      expect(gateway.createPixPayment).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: pagamento PIX', () => {
    it('Given pedido elegível, When gerar PIX, Then persiste split, QR Code e agenda pedido', async () => {
      const response = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);

      expect(response.body).toEqual(expect.objectContaining({
        orderId: orderId.toString(), method: 'PIX', status: 'PENDENTE', amount: 120,
        platformAmount: 14.4, providerAmount: 105.6,
        pix: expect.objectContaining({ qrCode: 'pix-copy-paste' }),
      }));
      const saved = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
      expect(Number(saved.feePct)).toBe(0.12);
      expect(saved.status).toBe(PaymentStatus.PENDENTE);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(OrderStatus.AGENDADO);
    });

    it('Given pedido sem preço final, When gerar PIX, Then usa o preço-base do serviço', async () => {
      await prisma.order.update({ where: { id: orderId }, data: { finalPrice: null } });
      const response = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);
      expect(response.body).toEqual(expect.objectContaining({ amount: 100, platformAmount: 12, providerAmount: 88 }));
    });

    it('Given taxa fora do intervalo permitido, When gerar PIX, Then retorna 400', async () => {
      await prisma.service.update({ where: { id: serviceId }, data: { platformFeePct: 1.2 } });
      const response = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(400);
      expect(response.body.message).toBe('Taxa da plataforma inválida');
      expect(gateway.createPixPayment).not.toHaveBeenCalled();
    });

    it('Given PIX pendente existente, When repetir, Then reutiliza sem duplicar cobrança', async () => {
      const first = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);
      const second = await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);
      expect(second.body.paymentId).toBe(first.body.paymentId);
      expect(gateway.createPixPayment).toHaveBeenCalledTimes(1);
      expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
    });
  });

  describe('Scenario: autorização de cartão', () => {
    it('Given cartão válido, When autorizar, Then salva somente referências não sensíveis', async () => {
      const card = validCard();
      const response = await postPayment(orderId, clientToken, { method: 'CARTAO', card }).expect(201);
      expect(response.body.status).toBe('AUTORIZADO');
      const saved = await prisma.payment.findUniqueOrThrow({ where: { orderId } });
      expect(saved.providerChargeId).toBe('ch_e2e_card');
      expect(JSON.stringify(saved.rawProviderResponse)).not.toContain(card.number);
      expect(JSON.stringify(saved.rawProviderResponse)).not.toContain(card.cvv);
      expect(await prisma.orderTimeline.count({ where: { orderId, event: 'PAYMENT_AUTHORIZED' } })).toBe(1);
    });
  });

  describe('Scenario: consulta do pagamento', () => {
    it('Given pagamento não iniciado, When consultar, Then retorna 404', async () => {
      await request(app.getHttpServer()).get(`/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${clientToken}`).expect(404);
    });

    it('Given pagamento iniciado, When o dono consultar, Then retorna dados limpos', async () => {
      await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);
      const response = await request(app.getHttpServer()).get(`/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${clientToken}`).expect(200);
      expect(response.body.pix.qrCode).toBe('pix-copy-paste');
    });

    it('Given pagamento iniciado, When outro cliente consultar, Then retorna 403', async () => {
      await postPayment(orderId, clientToken, { method: 'PIX' }).expect(201);
      await request(app.getHttpServer()).get(`/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${otherClientToken}`).expect(403);
    });
  });

  function postPayment(id: bigint, token: string, payload: object) {
    return request(app.getHttpServer()).post(`/orders/${id}/payment`)
      .set('Authorization', `Bearer ${token}`).send(payload);
  }

  function validCard() {
    return { number: '4111111111111111', holderName: 'CLIENTE TESTE', expMonth: 12, expYear: 2030, cvv: '123' };
  }

  async function cleanScenario() {
    const users = await prisma.user.findMany({ where: { email: { startsWith: 'payment.' } }, select: { id: true } });
    const ids = users.map(({ id }) => id);
    if (!ids.length) return;
    await prisma.order.deleteMany({ where: { OR: [{ clientId: { in: ids } }, { service: { providerId: { in: ids } } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});
