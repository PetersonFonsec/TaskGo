import { BadGatewayException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

export function gatewayPaymentStatus(status: string): PaymentStatus {
  const states: Record<string, PaymentStatus> = {
    pending: PaymentStatus.PENDENTE,
    processing: PaymentStatus.PENDENTE,
    authorized_pending_capture: PaymentStatus.AUTORIZADO,
    paid: PaymentStatus.PAGO,
    payment_failed: PaymentStatus.FALHOU,
    failed: PaymentStatus.FALHOU,
    canceled: PaymentStatus.CANCELADO,
    refunded: PaymentStatus.REEMBOLSADO,
    chargedback: PaymentStatus.REEMBOLSADO,
  };
  if (!states[status])
    throw new BadGatewayException('Estado financeiro não reconhecido');
  return states[status];
}

export const paidStatuses: PaymentStatus[] = [
  PaymentStatus.PAGO,
  PaymentStatus.CAPTURED,
  PaymentStatus.RELEASED,
];
export const authorizedStatuses: PaymentStatus[] = [
  PaymentStatus.AUTORIZADO,
  PaymentStatus.AUTHORIZED,
];
export const terminalStatuses: PaymentStatus[] = [
  PaymentStatus.CANCELADO,
  PaymentStatus.CANCELED,
  PaymentStatus.REEMBOLSADO,
  PaymentStatus.REFUNDED,
];
