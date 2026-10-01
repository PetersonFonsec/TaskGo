import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import {
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  UserType,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { OrderExpiredEvent } from '../events/order-expired.event';
import {
  isPaymentReleasable,
  OrderExpirationPolicy,
  OrderExpirationReason,
  releasablePaymentStatuses,
  resolveOrderExpiration,
} from './order-expiration.policy';

const HOUR_IN_MS = 60 * 60 * 1000;
const DEFAULT_INTERVAL_SECONDS = 300;
const BATCH_SIZE = 100;

const EXPIRATION_COPY: Record<OrderExpirationReason, { description: string }> =
  {
    APPROVAL_TIMEOUT: {
      description:
        'Pedido expirado automaticamente: o prestador não respondeu dentro do prazo.',
    },
    PAYMENT_TIMEOUT: {
      description:
        'Pedido expirado automaticamente: o pagamento não foi concluído dentro do prazo.',
    },
    SCHEDULE_PASSED: {
      description:
        'Pedido expirado automaticamente: o horário agendado passou antes da confirmação.',
    },
  };

// Somente pedidos sem cobrança viva entram na expiração; o mesmo filtro é
// repetido no updateMany para que a transição continue condicionada no banco.
const releasablePaymentFilter: Prisma.OrderWhereInput = {
  OR: [
    { payment: { is: null } },
    { payment: { is: { status: { in: releasablePaymentStatuses } } } },
  ],
};

type ExpirationCandidate = {
  id: bigint;
  status: OrderStatus;
  requestedAt: Date;
  scheduledFor: Date | null;
  payment: { id: bigint } | null;
  orderTimeline: { createdAt: Date }[];
};

export interface OrderExpirationRunResult {
  expired: number;
  skipped: number;
}

@Injectable()
export class OrderExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirationService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: OrderExpirationPolicy,
    private readonly config: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit() {
    const enabled = this.config.get('ORDER_EXPIRATION_ENABLED');
    if (enabled !== true && enabled !== 'true') return;
    const seconds = Number(
      this.config.get('ORDER_EXPIRATION_INTERVAL_SECONDS') ??
        DEFAULT_INTERVAL_SECONDS,
    );
    const intervalMs =
      (Number.isFinite(seconds) && seconds > 0
        ? seconds
        : DEFAULT_INTERVAL_SECONDS) * 1000;
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    this.timer.unref?.();
    this.logger.log(
      `Expiração automática de pedidos ativa (intervalo ${intervalMs / 1000}s)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Executa uma varredura; ignora chamadas sobrepostas na mesma instância. */
  async runOnce(now = new Date()): Promise<OrderExpirationRunResult> {
    if (this.running) return { expired: 0, skipped: 0 };
    this.running = true;
    try {
      const result = await this.expireStaleOrders(now);
      if (result.expired)
        this.logger.log(`Pedidos expirados automaticamente: ${result.expired}`);
      return result;
    } catch (error) {
      this.logger.error('Falha na expiração automática de pedidos', error);
      return { expired: 0, skipped: 0 };
    } finally {
      this.running = false;
    }
  }

  async expireStaleOrders(now = new Date()): Promise<OrderExpirationRunResult> {
    const { approvalTimeoutHours, paymentTimeoutHours } = this.policy.windows;
    const approvalCutoff = new Date(
      now.getTime() - approvalTimeoutHours * HOUR_IN_MS,
    );
    const paymentCutoff = new Date(
      now.getTime() - paymentTimeoutHours * HOUR_IN_MS,
    );
    const result: OrderExpirationRunResult = { expired: 0, skipped: 0 };
    let cursor: bigint | undefined;

    for (;;) {
      const candidates: ExpirationCandidate[] =
        await this.prisma.order.findMany({
          where: {
            ...(cursor ? { id: { gt: cursor } } : {}),
            AND: [
              releasablePaymentFilter,
              {
                OR: [
                  {
                    status: OrderStatus.AGUARDANDO_APROVACAO,
                    OR: [
                      { requestedAt: { lte: approvalCutoff } },
                      { scheduledFor: { lte: now } },
                    ],
                  },
                  {
                    status: OrderStatus.AGUARDANDO_PAGAMENTO,
                    OR: [
                      { scheduledFor: { lte: now } },
                      {
                        orderTimeline: {
                          some: {
                            event: OrderEventType.ACCEPTED,
                            createdAt: { lte: paymentCutoff },
                          },
                        },
                      },
                      {
                        requestedAt: { lte: paymentCutoff },
                        orderTimeline: {
                          none: { event: OrderEventType.ACCEPTED },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          select: {
            id: true,
            status: true,
            requestedAt: true,
            scheduledFor: true,
            payment: { select: { id: true } },
            orderTimeline: {
              where: { event: OrderEventType.ACCEPTED },
              select: { createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { id: 'asc' },
          take: BATCH_SIZE,
        });

      for (const candidate of candidates) {
        const expiration = resolveOrderExpiration(
          {
            ...candidate,
            acceptedAt: candidate.orderTimeline[0]?.createdAt ?? null,
          },
          { approvalTimeoutHours, paymentTimeoutHours },
        );
        if (
          !expiration ||
          expiration.expiresAt.getTime() > now.getTime() ||
          !(await this.expireOrder(candidate, expiration.reason, now))
        ) {
          result.skipped += 1;
          continue;
        }
        result.expired += 1;
      }

      if (candidates.length < BATCH_SIZE) return result;
      cursor = candidates[candidates.length - 1].id;
    }
  }

  /**
   * Transição atômica para CANCELADO. Usa o mesmo advisory lock do pagamento
   * (criação/cancelamento/conciliação) e condiciona o updateMany ao status lido;
   * count=0 significa que outra operação mudou o pedido antes e nada é gravado.
   */
  async expireOrder(
    candidate: Pick<ExpirationCandidate, 'id' | 'status' | 'payment'>,
    reason: OrderExpirationReason,
    now = new Date(),
  ) {
    const expired = await this.prisma.$transaction(async (tx) => {
      if (candidate.payment)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${candidate.payment.id})::text`;
      const payment = await tx.payment.findUnique({
        where: { orderId: candidate.id },
      });
      const attempt = await tx.paymentAttempt.findUnique({
        where: { orderId: candidate.id },
      });
      if (!isPaymentReleasable(payment, Boolean(attempt))) return false;

      const changed = await tx.order.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
          ...releasablePaymentFilter,
        },
        data: { status: OrderStatus.CANCELADO },
      });
      if (changed.count === 0) return false;

      if (payment?.status === PaymentStatus.CREATED)
        await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.CREATED },
          data: { status: PaymentStatus.CANCELADO, canceledAt: now },
        });
      await tx.orderTimeline.create({
        data: {
          orderId: candidate.id,
          event: OrderEventType.EXPIRED,
          description: EXPIRATION_COPY[reason].description,
          // Não há ator "sistema": registra a parte cujo prazo venceu.
          createdBy:
            candidate.status === OrderStatus.AGUARDANDO_APROVACAO
              ? UserType.PRESTADOR
              : UserType.CLIENTE,
          createdAt: now,
        },
      });
      return true;
    });

    if (expired)
      this.onOrderExpired(
        new OrderExpiredEvent(candidate.id, candidate.status, reason, now),
      );
    return expired;
  }

  /** Ponto de ligação das notificações de expiração (EventsHandler). */
  protected onOrderExpired(event: OrderExpiredEvent) {
    this.eventBus.publish(event);
  }
}
