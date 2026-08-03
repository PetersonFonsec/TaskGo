import { Payment, PaymentMethod } from '@prisma/client';

export function toPaymentResponse(payment: Payment) {
  return {
    id: payment.id.toString(),
    paymentId: payment.id.toString(),
    orderId: payment.orderId.toString(),
    method: payment.method,
    status: payment.status,
    amount: Number(payment.amount),
    platformAmount: Number(payment.platformAmount ?? 0),
    providerAmount: Number(payment.providerAmount ?? 0),
    feePct: Number(payment.feePct ?? 0),
    providerChargeId: payment.providerChargeId,
    pix:
      payment.method === PaymentMethod.PIX
        ? {
            qrCode: payment.pixQrCode,
            qrCodeBase64: payment.pixQrCodeBase64,
            expiresAt: payment.pixExpiresAt,
          }
        : undefined,
  };
}
