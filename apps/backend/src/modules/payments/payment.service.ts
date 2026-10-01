import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  OrderStatus,
  Payment,
  PaymentStatus,
  Prisma,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SettlementStrategies } from './settlement/settlement-strategies';
import { PaymentGateway, Charge } from './payment-gateway';
import {
  gatewayPaymentStatus,
  paidStatuses,
  terminalStatuses,
} from './payment-state';

type FinancialPayment = Pick<
  Payment,
  'id' | 'status' | 'providerChargeId' | 'amount'
>;
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly gateway: PaymentGateway,
    private readonly prisma: PrismaService,
    private readonly strategies: SettlementStrategies,
    private readonly notifications: NotificationService,
  ) {}

  private assertProvider(payment: Payment) {
    if (payment.provider !== this.gateway.provider)
      throw new BadRequestException(
        'Pagamento legado requer conciliação com o provedor original',
      );
  }
  // PIX is received before service completion; there is no delayed card capture.
  async capturePayment(payment: FinancialPayment) {
    const current = await this.reconcilePayment(payment.id);
    if (!paidStatuses.includes(current.status))
      throw new BadRequestException('Pagamento ainda não confirmado');
    return { capturedAt: current.capturedAt ?? current.paidAt ?? new Date() };
  }

  async cancelPayment(payment: FinancialPayment) {
    const current = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${payment.id})::text`;
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${current.orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: current.orderId },
      });
      if (
        ![
          OrderStatus.AGUARDANDO_APROVACAO,
          OrderStatus.AGUARDANDO_PAGAMENTO,
          OrderStatus.AGENDADO,
          OrderStatus.CANCELADO,
        ].includes(order.status as any)
      )
        throw new BadRequestException('Pedido não pode mais ser cancelado');
      if (
        current.status === PaymentStatus.CREATED &&
        !current.providerChargeId
      ) {
        if (
          await tx.paymentAttempt.findUnique({
            where: { orderId: current.orderId },
          })
        )
          throw new BadRequestException(
            'Tentativa financeira pendente de conciliação',
          );
        return tx.payment.update({
          where: { id: current.id },
          data: { status: PaymentStatus.CANCELADO, canceledAt: new Date() },
        });
      }
      this.assertProvider(current);
      return current;
    });
    if (terminalStatuses.includes(current.status))
      return {
        canceledAt: current.canceledAt ?? new Date(),
        status: current.status,
      };
    const reconciled = await this.reconcilePayment(current.id);
    if (terminalStatuses.includes(reconciled.status))
      return {
        canceledAt: reconciled.canceledAt ?? new Date(),
        status: reconciled.status,
      };
    if (
      !paidStatuses.includes(reconciled.status) ||
      !reconciled.providerChargeId
    )
      throw new BadRequestException(
        'PIX pendente: aguarde expiração ou pagamento para conciliar o cancelamento',
      );
    // Durable marker before network: a timeout must not trigger a second refund.
    const claim = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${current.id})::text`;
      await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${current.orderId} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: current.orderId },
      });
      if (
        !['AGENDADO', 'AGUARDANDO_PAGAMENTO', 'CANCELADO'].includes(
          order.status,
        )
      )
        throw new BadRequestException('Pedido não pode mais ser cancelado');
      const claim = await tx.payment.updateMany({
        where: { id: current.id, refundRequestedAt: null },
        data: { refundRequestedAt: new Date() },
      });
      await tx.order.updateMany({
        where: { id: current.orderId, status: 'AGENDADO' },
        data: { status: 'AGUARDANDO_PAGAMENTO' },
      });
      return claim;
    });
    if (claim.count === 1)
      await this.gateway.refundPayment(reconciled.providerChargeId);
    const refunded = await this.reconcilePayment(current.id);
    if (refunded.status !== PaymentStatus.REEMBOLSADO)
      throw new BadRequestException(
        'Estorno solicitado; aguarde confirmação do gateway',
      );
    return {
      canceledAt: refunded.refundedAt ?? new Date(),
      status: refunded.status,
    };
  }

  validateCharge(
    payment: Pick<Payment, 'providerChargeId' | 'providerOrderId' | 'amount'>,
    charge: Charge,
  ) {
    if (
      charge.id !== payment.providerChargeId ||
      charge.order.id !== payment.providerOrderId ||
      charge.amount !== Math.round(Number(payment.amount) * 100)
    )
      throw new BadRequestException('Cobrança divergente do pedido');
  }

  /** Called inside the same transaction as client confirmation (transactional outbox). */
  async enqueueSettlement(tx: Prisma.TransactionClient, payment: Payment) {
    this.assertProvider(payment);
    if (payment.refundRequestedAt || payment.settlementBlockedAt)
      throw new BadRequestException('Pagamento em análise impede repasse');
    this.strategies.resolve(payment.settlementStrategy);
    if (!payment.settlementDestination)
      throw new BadRequestException('Estratégia de repasse não disponível');
    const amountCents = Math.round(Number(payment.providerAmount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents < 100)
      throw new BadRequestException('Valor de repasse inválido');
    await tx.paymentSettlement.upsert({
      where: { paymentId: payment.id },
      update: {},
      create: {
        paymentId: payment.id,
        strategy: payment.settlementStrategy,
        amountCents,
        destination: payment.settlementDestination as Prisma.InputJsonValue,
        externalId: `taskgo-payment-${payment.id}`,
        status: 'READY',
      },
    });
  }

  async reconcilePayment(paymentId: bigint) {
    let scheduledOrderId = null as bigint | null;
    const reconciled = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${paymentId})::text`;
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        this.assertProvider(payment);
        if (!payment.providerChargeId || this.gateway.simulated) return payment;
        const charge = await this.gateway.getCharge(payment.providerChargeId);
        this.validateCharge(payment, charge);
        const status = gatewayPaymentStatus(charge.status);
        if (
          terminalStatuses.includes(payment.status) &&
          !terminalStatuses.includes(status)
        )
          return payment;
        if (
          paidStatuses.includes(payment.status) &&
          [
            PaymentStatus.PENDENTE,
            PaymentStatus.AUTORIZADO,
            PaymentStatus.FALHOU,
          ].includes(status as any)
        )
          return payment;
        if (payment.status === status) return payment;
        const now = new Date();
        const saved = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status,
            ...(status === PaymentStatus.PAGO
              ? {
                  paidAt: payment.paidAt ?? now,
                  capturedAt: payment.capturedAt ?? now,
                }
              : {}),
            ...(status === PaymentStatus.CANCELADO
              ? { canceledAt: payment.canceledAt ?? now }
              : {}),
            ...(status === PaymentStatus.REEMBOLSADO
              ? { refundedAt: payment.refundedAt ?? now }
              : {}),
            rawProviderResponse: { id: charge.id, status: charge.status },
          },
        });
        const paid =
          paidStatuses.includes(status) &&
          !payment.refundRequestedAt &&
          !payment.settlementBlockedAt;
        const changed = await tx.order.updateMany({
          where: {
            id: payment.orderId,
            status: paid
              ? OrderStatus.AGUARDANDO_PAGAMENTO
              : OrderStatus.AGENDADO,
          },
          data: {
            status: paid
              ? OrderStatus.AGENDADO
              : OrderStatus.AGUARDANDO_PAGAMENTO,
          },
        });
        if (paid && changed.count === 1) scheduledOrderId = payment.orderId;
        await tx.orderTimeline.create({
          data: {
            orderId: payment.orderId,
            event: paid ? 'PAYMENT_CAPTURED' : 'CANCELED',
            description: `Conciliação financeira: ${status}.`,
            createdBy: UserType.CLIENTE,
            createdAt: now,
          },
        });
        return saved;
      },
      { timeout: 60000 },
    );
    // Somente a transição AGUARDANDO_PAGAMENTO -> AGENDADO avisa o cliente, após o commit.
    if (scheduledOrderId !== null)
      void this.notifyPaymentConfirmed(scheduledOrderId);
    return reconciled;
  }

  /** Disparado sem aguardar: falhas são apenas registradas e não afetam a conciliação. */
  private async notifyPaymentConfirmed(orderId: bigint) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          scheduledFor: true,
          client: { select: { email: true, name: true } },
          service: { select: { title: true } },
        },
      });
      if (!order) return;
      await this.notifications.notifyClientPaymentConfirmed(order.client, {
        id: orderId,
        serviceTitle: order.service.title,
        scheduledFor: order.scheduledFor,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao preparar aviso de pagamento do pedido ${orderId.toString()}: ${(error as Error).message}`,
      );
    }
  }
}
