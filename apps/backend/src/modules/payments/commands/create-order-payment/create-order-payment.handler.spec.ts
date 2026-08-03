import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { CreateOrderPaymentCommand } from './create-order-payment.command';
import { CreateOrderPaymentHandler } from './create-order-payment.handler';

describe('CreateOrderPaymentHandler', () => {
  const orderId = 10n;
  const clientId = 2n;
  let prisma: any;
  let gateway: any;
  let handler: CreateOrderPaymentHandler;
  const order = {
    clientId,
    status: OrderStatus.AGUARDANDO_PAGAMENTO,
    finalPrice: 120,
    client: {
      name: 'Cliente',
      email: 'cliente@teste.com',
      cpf: '12345678901',
    },
    payment: {
      id: 5n,
      orderId,
      method: PaymentMethod.PIX,
      status: PaymentStatus.CREATED,
      amount: 120,
    },
    service: {
      basePrice: 100,
      platformFeePct: 0.12,
      category: 'reparo',
      provider: { pagarmeRecipientId: 'rp_provider' },
    },
  };

  beforeEach(() => {
    const tx = {
      payment: { upsert: jest.fn() },
      orderTimeline: { create: jest.fn() },
      order: { update: jest.fn() },
    };
    prisma = {
      order: { findUnique: jest.fn() },
      category: { findFirst: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
      __tx: tx,
    };
    gateway = {
      createPixPayment: jest.fn(),
      authorizeCardPayment: jest.fn(),
    };
    handler = new CreateOrderPaymentHandler(prisma, gateway, {
      get: jest.fn().mockReturnValue('rp_platform'),
      getOrThrow: jest.fn().mockReturnValue(0.12),
    } as unknown as ConfigService);
  });

  it('starts a PIX payment and persists the split transactionally', async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    gateway.createPixPayment.mockResolvedValue({
      orderId: 'or_1',
      chargeId: 'ch_1',
      qrCode: 'pix-code',
      qrCodeBase64: null,
      expiresAt: new Date(),
      raw: { id: 'or_1' },
    });
    prisma.__tx.payment.upsert.mockImplementation(({ create }) => ({
      id: 5n,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      capturedAt: null,
      canceledAt: null,
      refundedAt: null,
      failureReason: null,
      ...create,
    }));

    const result = await handler.execute(
      new CreateOrderPaymentCommand(orderId, clientId, {
        method: PaymentMethod.PIX,
      }),
    );

    expect(result.status).toBe(PaymentStatus.PENDENTE);
    expect(result.pix?.qrCode).toBe('pix-code');
    expect(prisma.__tx.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          platformAmount: 14.4,
          providerAmount: 105.6,
        }),
      }),
    );
  });

  it('authorizes a card without persisting sensitive card fields', async () => {
    prisma.order.findUnique.mockResolvedValue(order);
    gateway.authorizeCardPayment.mockResolvedValue({
      orderId: 'or_2',
      chargeId: 'ch_2',
      qrCode: null,
      qrCodeBase64: null,
      expiresAt: null,
      raw: { id: 'or_2' },
    });
    prisma.__tx.payment.upsert.mockImplementation(({ create }) => ({
      id: 6n,
      ...create,
    }));
    const card = {
      number: '4111111111111111',
      holderName: 'CLIENTE TESTE',
      expMonth: 12,
      expYear: 2030,
      cvv: '123',
    };

    await handler.execute(
      new CreateOrderPaymentCommand(orderId, clientId, {
        method: PaymentMethod.CARTAO,
        card,
      }),
    );

    const persisted = JSON.stringify(
      prisma.__tx.payment.upsert.mock.calls[0][0],
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    );
    expect(persisted).not.toContain(card.number);
    expect(persisted).not.toContain(card.cvv);
  });

  it.each([
    [null, clientId, NotFoundException],
    [order, 99n, ForbiddenException],
    [
      {
        ...order,
        service: {
          ...order.service,
          provider: { pagarmeRecipientId: null },
        },
      },
      clientId,
      BadRequestException,
    ],
  ])(
    'rejects invalid payment ownership or eligibility',
    async (value, userId, error) => {
      prisma.order.findUnique.mockResolvedValue(value);
      await expect(
        handler.execute(
          new CreateOrderPaymentCommand(orderId, userId, {
            method: PaymentMethod.PIX,
          }),
        ),
      ).rejects.toBeInstanceOf(error);
    },
  );
});
