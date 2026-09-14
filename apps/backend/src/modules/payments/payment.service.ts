import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Payment, PaymentStatus, UserType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PagarmeService } from './pagarme.service';
import {
  authorizedStatuses,
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
  constructor(
    private readonly pagarme: PagarmeService,
    private readonly prisma: PrismaService,
  ) {}

  // The database lock serializes capture/cancel/reconciliation across API replicas.
  // Re-read the canonical charge before every mutation, including after an ambiguous timeout.
  async capturePayment(payment: FinancialPayment) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${payment.id})::text`;
        const current = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        await tx.$queryRaw`SELECT id FROM pedidos WHERE id = ${current.orderId} FOR UPDATE`;
        const order = await tx.order.findUniqueOrThrow({
          where: { id: current.orderId },
        });
        if (
          order.status !== OrderStatus.AGUARDANDO_CONFIRMACAO_CLIENTE ||
          Math.round(Number(order.finalPrice) * 100) !==
            Math.round(Number(current.amount) * 100)
        )
          throw new BadRequestException(
            'Pedido não disponível para captura pelo valor acordado',
          );

        if (terminalStatuses.includes(current.status))
          throw new BadRequestException('Pagamento cancelado ou reembolsado');
        if (
          (!authorizedStatuses.includes(current.status) &&
            !paidStatuses.includes(current.status)) ||
          !current.providerChargeId
        )
          throw new BadRequestException(
            'O pagamento ainda não está autorizado para captura',
          );
        let charge = await this.pagarme.getCharge(current.providerChargeId);
        this.validateCharge(current, charge);
        if (charge.status !== 'paid') {
          if (charge.status !== 'authorized_pending_capture')
            throw new BadRequestException('Cobrança não autorizada no gateway');
          charge = await this.pagarme.capturePayment(
            current.providerChargeId,
            Number(current.amount),
          );
          this.validateCharge(current, charge);
          if (charge.status !== 'paid')
            throw new BadRequestException(
              'Captura ainda não confirmada no gateway',
            );
        }
        const capturedAt = new Date();
        await tx.payment.update({
          where: { id: current.id },
          data: { status: PaymentStatus.PAGO, capturedAt, paidAt: capturedAt },
        });
        return { capturedAt };
      },
      { timeout: 40000 },
    );
  }

  async cancelPayment(payment: FinancialPayment) {
    return this.prisma.$transaction(
      async (tx) => {
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
          const attempt = await tx.paymentAttempt.findUnique({
            where: { orderId: current.orderId },
          });
          if (attempt)
            throw new BadRequestException(
              'Tentativa financeira pendente de conciliação',
            );
          const canceledAt = new Date();
          await tx.payment.update({
            where: { id: current.id },
            data: { status: PaymentStatus.CANCELADO, canceledAt },
          });
          return { canceledAt, status: PaymentStatus.CANCELADO };
        }

        if (terminalStatuses.includes(current.status))
          return {
            canceledAt: current.canceledAt ?? new Date(),
            status: current.status,
          };
        if (!current.providerChargeId)
          throw new BadRequestException(
            'Cobrança pendente de conciliação; cancelamento não confirmado',
          );
        let charge = await this.pagarme.getCharge(current.providerChargeId);
        this.validateCharge(current, charge);
        const wasPaid =
          paidStatuses.includes(current.status) || charge.status === 'paid';
        if (
          !['canceled', 'refunded', 'failed', 'payment_failed'].includes(
            charge.status,
          )
        ) {
          charge = await this.pagarme.cancelPayment(current.providerChargeId);
          this.validateCharge(current, charge);
          if (!['canceled', 'refunded'].includes(charge.status))
            throw new BadRequestException(
              'Estorno ainda não confirmado no gateway',
            );
        }
        const canceledAt = new Date();
        const status = wasPaid
          ? PaymentStatus.REEMBOLSADO
          : PaymentStatus.CANCELADO;
        await tx.payment.update({
          where: { id: current.id },
          data: {
            status,
            canceledAt,
            ...(wasPaid ? { refundedAt: canceledAt } : {}),
          },
        });
        return { canceledAt, status };
      },
      { timeout: 40000 },
    );
  }

  validateCharge(
    payment: Pick<Payment, 'providerChargeId' | 'providerOrderId' | 'amount'>,
    charge: any,
  ) {
    if (
      charge.id !== payment.providerChargeId ||
      charge.order?.id !== payment.providerOrderId ||
      charge.amount !== Math.round(Number(payment.amount) * 100)
    )
      throw new BadRequestException('Cobrança divergente do pedido');
  }

  async reconcilePayment(paymentId: bigint) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(${paymentId})::text`;
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
        });
        if (!payment.providerChargeId || this.pagarme.simulated) return payment;
        const charge = await this.pagarme.getCharge(payment.providerChargeId);
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
        const usable =
          payment.method === 'PIX' && paidStatuses.includes(status);
        const changed = await tx.order.updateMany({
          where: {
            id: payment.orderId,
            status: usable
              ? OrderStatus.AGUARDANDO_PAGAMENTO
              : OrderStatus.AGENDADO,
          },
          data: {
            status: usable
              ? OrderStatus.AGENDADO
              : OrderStatus.AGUARDANDO_PAGAMENTO,
          },
        });
        if (changed.count || payment.status !== status)
          await tx.orderTimeline.create({
            data: {
              orderId: payment.orderId,
              event:
                status === PaymentStatus.PAGO
                  ? 'PAYMENT_CAPTURED'
                  : usable
                    ? 'PAYMENT_AUTHORIZED'
                    : 'CANCELED',
              description: `Conciliação financeira: ${status}.`,
              createdBy: UserType.CLIENTE,
              createdAt: now,
            },
          });
        await tx.paymentWebhookEvent.updateMany({
          where: {
            processedAt: null,
            payload: { path: ['chargeId'], equals: payment.providerChargeId },
          },
          data: { paymentId: payment.id, processedAt: now },
        });
        return saved;
      },
      { timeout: 20000 },
    );
  }
}
