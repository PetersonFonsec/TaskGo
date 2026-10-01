import { Prisma } from '@prisma/client';

/** Order lists must not expose destination keys or raw financial payloads. */
export const orderPaymentSelect = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amount: true,
  platformAmount: true,
  providerAmount: true,
  feePct: true,
  paidAt: true,
  authorizedAt: true,
  capturedAt: true,
  canceledAt: true,
  refundedAt: true,
  providerChargeId: true,
  providerOrderId: true,
  pixQrCode: true,
  pixQrCodeBase64: true,
  pixExpiresAt: true,
  paymentUrl: true,
} satisfies Prisma.PaymentSelect;
