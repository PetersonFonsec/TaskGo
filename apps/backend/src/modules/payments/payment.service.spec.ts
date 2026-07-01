import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const orderId = 10n;
  const clientId = 2n;
  let prisma: any;
  let pagarme: any;
  let service: PaymentService;
  const order = {
    clientId, status: OrderStatus.AGUARDANDO_PAGAMENTO, finalPrice: 120,
    client: { name: 'Cliente', email: 'cliente@teste.com', cpf: '12345678901' },
    payment: { id: 5n, orderId, method: PaymentMethod.PIX, status: PaymentStatus.CREATED, amount: 120 },
    service: { title: 'Serviço', basePrice: 100, platformFeePct: 0.12, category: 'reparo',
      provider: { id: 7n, pagarmeRecipientId: 'rp_provider' } },
  };

  beforeEach(() => {
    const tx = {
      payment: { upsert: jest.fn(), update: jest.fn() }, orderTimeline: { create: jest.fn() }, order: { update: jest.fn() },
      paymentWebhookEvent: { create: jest.fn() },
    };
    prisma = {
      order: { findUnique: jest.fn() }, category: { findFirst: jest.fn() },
      paymentWebhookEvent: { findUnique: jest.fn() }, payment: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)), __tx: tx,
    };
    pagarme = {
      createPixPayment: jest.fn(), authorizeCardPayment: jest.fn(), capturePayment: jest.fn(),
    };
    service = new PaymentService(prisma, pagarme);
  });

  it('inicia um pagamento PIX e salva o split', async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    pagarme.createPixPayment.mockResolvedValue({ orderId: 'or_1', chargeId: 'ch_1', qrCode: 'pix-code',
      qrCodeBase64: null, expiresAt: new Date(), raw: { id: 'or_1' } });
    prisma.__tx.payment.upsert.mockImplementation(({ create }) => ({ id: 5n, ...create }));

    const result = await service.createOrderPayment(orderId, clientId, { method: PaymentMethod.PIX });

    expect(result.status).toBe(PaymentStatus.PENDENTE);
    expect(result.pix.qrCode).toBe('pix-code');
    expect(prisma.__tx.payment.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({
      platformAmount: 14.4, providerAmount: 105.6,
    }) }));
  });

  it('autoriza cartão sem persistir seus dados sensíveis', async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    pagarme.authorizeCardPayment.mockResolvedValue({ orderId: 'or_2', chargeId: 'ch_2', qrCode: null,
      qrCodeBase64: null, expiresAt: null, raw: { id: 'or_2' } });
    prisma.__tx.payment.upsert.mockImplementation(({ create }) => ({ id: 6n, ...create }));
    const card = { number: '4111111111111111', holderName: 'CLIENTE TESTE', expMonth: 12, expYear: 2030, cvv: '123' };

    const result = await service.createOrderPayment(orderId, clientId, { method: PaymentMethod.CARTAO, card });

    expect(result.status).toBe(PaymentStatus.AUTORIZADO);
    const persisted = prisma.__tx.payment.upsert.mock.calls[0][0];
    const serialized = JSON.stringify(persisted, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    expect(serialized).not.toContain(card.number);
    expect(serialized).not.toContain(card.cvv);
  });

  it('impede outro usuário de pagar', async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    await expect(service.createOrderPayment(orderId, 99n, { method: PaymentMethod.PIX })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('retorna 404 para pedido inexistente', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.createOrderPayment(orderId, clientId, { method: PaymentMethod.PIX })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita prestador sem recipientId', async () => {
    prisma.order.findUnique.mockResolvedValue({ ...order, service: { ...order.service, provider: { id: 7n, pagarmeRecipientId: null } } });
    await expect(service.createOrderPayment(orderId, clientId, { method: PaymentMethod.PIX })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('processa charge.paid de forma idempotente', async () => {
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue({ id: 5n, paidAt: null, capturedAt: null, canceledAt: null, refundedAt: null });
    await service.handleWebhook({ id: 'evt_1', type: 'charge.paid', data: { id: 'ch_1' } });
    expect(prisma.__tx.paymentWebhookEvent.create).toHaveBeenCalled();
    expect(prisma.__tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.PAGO }),
    }));
  });
});
