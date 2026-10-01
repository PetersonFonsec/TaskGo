import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Payment, PaymentStatus } from '@prisma/client';

import { terminalStatuses } from '../../payments/payment-state';

const HOUR_IN_MS = 60 * 60 * 1000;

export const DEFAULT_APPROVAL_TIMEOUT_HOURS = 12;
export const DEFAULT_PAYMENT_TIMEOUT_HOURS = 2;

export type OrderExpirationReason =
  | 'APPROVAL_TIMEOUT'
  | 'PAYMENT_TIMEOUT'
  | 'SCHEDULE_PASSED';

export interface OrderExpirationWindows {
  approvalTimeoutHours: number;
  paymentTimeoutHours: number;
}

export interface ExpirableOrder {
  status: OrderStatus;
  requestedAt: Date;
  scheduledFor: Date | null;
  /** Momento do aceite do prestador (último evento ACCEPTED). */
  acceptedAt?: Date | null;
}

export const expirableOrderStatuses: OrderStatus[] = [
  OrderStatus.AGUARDANDO_APROVACAO,
  OrderStatus.AGUARDANDO_PAGAMENTO,
];

// Estados sem cobrança viva: expirar o pedido não deixa dinheiro em aberto.
// CREATED só é liberável sem charge e sem PaymentAttempt (ver isPaymentReleasable).
export const releasablePaymentStatuses: PaymentStatus[] = [
  PaymentStatus.CREATED,
  PaymentStatus.FALHOU,
  PaymentStatus.FAILED,
  ...terminalStatuses,
];

/**
 * PIX pago, pendente, autorizado ou com tentativa enviada ao gateway sem
 * charge persistida é ambíguo e nunca pode ser expirado automaticamente.
 */
export function isPaymentReleasable(
  payment: Pick<Payment, 'status' | 'providerChargeId'> | null,
  hasPendingAttempt: boolean,
) {
  if (!payment) return !hasPendingAttempt;
  if (payment.status === PaymentStatus.CREATED)
    return !payment.providerChargeId && !hasPendingAttempt;
  return releasablePaymentStatuses.includes(payment.status);
}

export function resolveOrderExpiration(
  order: ExpirableOrder,
  windows: OrderExpirationWindows,
): { expiresAt: Date; reason: OrderExpirationReason } | null {
  let base: Date;
  let hours: number;
  let reason: OrderExpirationReason;
  if (order.status === OrderStatus.AGUARDANDO_APROVACAO) {
    base = order.requestedAt;
    hours = windows.approvalTimeoutHours;
    reason = 'APPROVAL_TIMEOUT';
  } else if (order.status === OrderStatus.AGUARDANDO_PAGAMENTO) {
    base = order.acceptedAt ?? order.requestedAt;
    hours = windows.paymentTimeoutHours;
    reason = 'PAYMENT_TIMEOUT';
  } else {
    return null;
  }
  const deadline = new Date(base.getTime() + hours * HOUR_IN_MS);
  if (order.scheduledFor && order.scheduledFor.getTime() <= deadline.getTime())
    return { expiresAt: order.scheduledFor, reason: 'SCHEDULE_PASSED' };
  return { expiresAt: deadline, reason };
}

@Injectable()
export class OrderExpirationPolicy {
  constructor(private readonly config: ConfigService) {}

  get windows(): OrderExpirationWindows {
    return {
      approvalTimeoutHours: this.readHours(
        'ORDER_APPROVAL_TIMEOUT_HOURS',
        DEFAULT_APPROVAL_TIMEOUT_HOURS,
      ),
      paymentTimeoutHours: this.readHours(
        'ORDER_PAYMENT_TIMEOUT_HOURS',
        DEFAULT_PAYMENT_TIMEOUT_HOURS,
      ),
    };
  }

  /** Prazo exibido a cliente e prestador; null fora dos estados expiráveis. */
  expiresAt(order: ExpirableOrder): Date | null {
    return resolveOrderExpiration(order, this.windows)?.expiresAt ?? null;
  }

  private readHours(key: string, fallback: number) {
    const value = Number(this.config.get(key) ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
