export class PaymentResponseDto {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  platformAmount: number;
  providerAmount: number;
  feePct: number;
  providerChargeId?: string;
  pix?: { qrCode: string; qrCodeBase64: string | null; expiresAt: Date | null };
}
