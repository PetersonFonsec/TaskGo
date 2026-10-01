import { OrderStatus, PaymentStatus } from '@prisma/client';

import { OrderExpiredEvent } from '../events/order-expired.event';
import {
  isPaymentReleasable,
  OrderExpirationPolicy,
  resolveOrderExpiration,
} from './order-expiration.policy';
import { OrderExpirationService } from './order-expiration.service';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-10-01T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR);
const inHours = (hours: number) => new Date(now.getTime() + hours * HOUR);

function setup({
  candidates = [] as any[],
  payment = { id: 9n, status: PaymentStatus.CREATED, providerChargeId: null },
  attempt = null as unknown,
  updateCount = 1,
  config = {} as Record<string, unknown>,
} = {}) {
  const tx = {
    $queryRaw: jest.fn(),
    payment: {
      findUnique: jest.fn().mockResolvedValue(payment),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    paymentAttempt: { findUnique: jest.fn().mockResolvedValue(attempt) },
    order: {
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
    },
    orderTimeline: { create: jest.fn() },
  };
  const prisma = {
    order: { findMany: jest.fn().mockResolvedValue(candidates) },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const configService = { get: jest.fn((key: string) => config[key]) };
  const eventBus = { publish: jest.fn() };
  const service = new OrderExpirationService(
    prisma as any,
    new OrderExpirationPolicy(configService as any),
    configService as any,
    eventBus as any,
  );
  return { service, prisma, tx, eventBus };
}

const awaitingApproval = (overrides = {}) => ({
  id: 1n,
  status: OrderStatus.AGUARDANDO_APROVACAO,
  requestedAt: hoursAgo(13),
  scheduledFor: inHours(48),
  payment: { id: 9n },
  orderTimeline: [],
  ...overrides,
});

describe('OrderExpirationService', () => {
  afterEach(() => jest.useRealTimers());

  it('expira pedido sem resposta do prestador e libera o horário', async () => {
    const { service, tx, eventBus } = setup({
      candidates: [awaitingApproval()],
    });

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 1,
      skipped: 0,
    });

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 1n,
        status: OrderStatus.AGUARDANDO_APROVACAO,
      }),
      data: { status: OrderStatus.CANCELADO },
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: 9n, status: PaymentStatus.CREATED },
      data: { status: PaymentStatus.CANCELADO, canceledAt: now },
    });
    expect(tx.orderTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 1n,
        event: 'EXPIRED',
        createdAt: now,
      }),
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new OrderExpiredEvent(
        1n,
        OrderStatus.AGUARDANDO_APROVACAO,
        'APPROVAL_TIMEOUT',
        now,
      ),
    );
  });

  it('expira pagamento não iniciado após o prazo contado do aceite', async () => {
    const { service, tx, eventBus } = setup({
      candidates: [
        awaitingApproval({
          status: OrderStatus.AGUARDANDO_PAGAMENTO,
          requestedAt: hoursAgo(30),
          orderTimeline: [{ createdAt: hoursAgo(3) }],
        }),
      ],
      payment: {
        id: 9n,
        status: PaymentStatus.FALHOU,
        providerChargeId: 'ch_1',
      },
    });

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 1,
      skipped: 0,
    });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'PAYMENT_TIMEOUT' }),
    );
  });

  it('expira quando o horário agendado já passou', async () => {
    const { service, eventBus } = setup({
      candidates: [
        awaitingApproval({
          requestedAt: hoursAgo(1),
          scheduledFor: hoursAgo(0.5),
        }),
      ],
    });

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 1,
      skipped: 0,
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'SCHEDULE_PASSED' }),
    );
  });

  it('não expira pedido ainda dentro do prazo', async () => {
    const { service, prisma } = setup({
      candidates: [
        awaitingApproval({
          status: OrderStatus.AGUARDANDO_PAGAMENTO,
          requestedAt: hoursAgo(30),
          orderTimeline: [{ createdAt: hoursAgo(1) }],
        }),
      ],
    });

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 0,
      skipped: 1,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['PIX pago', PaymentStatus.PAGO, 'ch_1', null],
    ['PIX capturado', PaymentStatus.CAPTURED, 'ch_1', null],
    ['PIX pendente no gateway', PaymentStatus.PENDENTE, 'ch_1', null],
    ['autorizado', PaymentStatus.AUTORIZADO, 'ch_1', null],
    ['tentativa sem charge', PaymentStatus.CREATED, null, { orderId: 1n }],
    ['CREATED com charge', PaymentStatus.CREATED, 'ch_1', null],
  ])(
    'não expira com pagamento %s (estado canônico relido sob lock)',
    async (_label, status, providerChargeId, attempt) => {
      const { service, tx, eventBus } = setup({
        candidates: [
          awaitingApproval({ status: OrderStatus.AGUARDANDO_PAGAMENTO }),
        ],
        payment: { id: 9n, status, providerChargeId },
        attempt,
      });

      await expect(service.expireStaleOrders(now)).resolves.toEqual({
        expired: 0,
        skipped: 1,
      });
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.orderTimeline.create).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    },
  );

  it('não grava nada quando outra operação mudou o pedido (updateMany count=0)', async () => {
    const { service, tx, eventBus } = setup({
      candidates: [awaitingApproval()],
      updateCount: 0,
    });

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 0,
      skipped: 1,
    });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.orderTimeline.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('busca somente pedidos sem cobrança viva e respeita prazos configurados', async () => {
    const { service, prisma } = setup({
      config: {
        ORDER_APPROVAL_TIMEOUT_HOURS: 6,
        ORDER_PAYMENT_TIMEOUT_HOURS: 1,
      },
    });

    await service.expireStaleOrders(now);

    const { where } = prisma.order.findMany.mock.calls[0][0];
    const [paymentFilter, statusFilter] = where.AND;
    expect(paymentFilter.OR[1].payment.is.status.in).not.toContain(
      PaymentStatus.PAGO,
    );
    expect(paymentFilter.OR[1].payment.is.status.in).not.toContain(
      PaymentStatus.PENDENTE,
    );
    expect(statusFilter.OR[0].OR[0]).toEqual({
      requestedAt: { lte: hoursAgo(6) },
    });
    expect(statusFilter.OR[1].OR[1].orderTimeline.some.createdAt).toEqual({
      lte: hoursAgo(1),
    });
  });

  it('pagina a varredura por id até esgotar os candidatos', async () => {
    const { service, prisma } = setup();
    const page = Array.from({ length: 100 }, (_, index) =>
      awaitingApproval({ id: BigInt(index + 1), requestedAt: now }),
    );
    prisma.order.findMany.mockResolvedValueOnce(page).mockResolvedValueOnce([]);

    await expect(service.expireStaleOrders(now)).resolves.toEqual({
      expired: 0,
      skipped: 100,
    });
    expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.order.findMany.mock.calls[1][0].where.id).toEqual({
      gt: 100n,
    });
  });

  it('agenda a varredura apenas quando habilitado e para no destroy', () => {
    jest.useFakeTimers();
    const disabled = setup({ config: { ORDER_EXPIRATION_ENABLED: false } });
    disabled.service.onModuleInit();
    expect(jest.getTimerCount()).toBe(0);

    const enabled = setup({
      config: {
        ORDER_EXPIRATION_ENABLED: true,
        ORDER_EXPIRATION_INTERVAL_SECONDS: 60,
      },
    });
    const run = jest
      .spyOn(enabled.service, 'runOnce')
      .mockResolvedValue({ expired: 0, skipped: 0 });
    enabled.service.onModuleInit();
    jest.advanceTimersByTime(60_000);
    expect(run).toHaveBeenCalledTimes(1);

    enabled.service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('runOnce registra a falha sem derrubar o processo', async () => {
    const { service, prisma } = setup();
    prisma.order.findMany.mockRejectedValue(new Error('db down'));
    jest.spyOn((service as any).logger, 'error').mockImplementation();

    await expect(service.runOnce(now)).resolves.toEqual({
      expired: 0,
      skipped: 0,
    });
  });
});

describe('order expiration policy', () => {
  const windows = { approvalTimeoutHours: 12, paymentTimeoutHours: 2 };

  it('calcula expiresAt pelo menor entre prazo e horário agendado', () => {
    expect(
      resolveOrderExpiration(
        {
          status: OrderStatus.AGUARDANDO_APROVACAO,
          requestedAt: now,
          scheduledFor: inHours(48),
        },
        windows,
      ),
    ).toEqual({ expiresAt: inHours(12), reason: 'APPROVAL_TIMEOUT' });
    expect(
      resolveOrderExpiration(
        {
          status: OrderStatus.AGUARDANDO_PAGAMENTO,
          requestedAt: hoursAgo(10),
          acceptedAt: now,
          scheduledFor: inHours(1),
        },
        windows,
      ),
    ).toEqual({ expiresAt: inHours(1), reason: 'SCHEDULE_PASSED' });
    expect(
      resolveOrderExpiration(
        {
          status: OrderStatus.AGENDADO,
          requestedAt: now,
          scheduledFor: inHours(1),
        },
        windows,
      ),
    ).toBeNull();
  });

  it('considera liberável apenas pagamento sem cobrança viva', () => {
    expect(isPaymentReleasable(null, false)).toBe(true);
    expect(isPaymentReleasable(null, true)).toBe(false);
    expect(
      isPaymentReleasable(
        { status: PaymentStatus.CANCELADO, providerChargeId: 'ch_1' },
        false,
      ),
    ).toBe(true);
    expect(
      isPaymentReleasable(
        { status: PaymentStatus.PENDENTE, providerChargeId: 'ch_1' },
        false,
      ),
    ).toBe(false);
  });
});
