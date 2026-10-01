/** Provider-neutral boundary. Amounts at this boundary are always integer cents. */
export type PixDestination = {
  key: string;
  type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
};
export type GatewayInput = {
  idempotencyKey: string;
  orderId: bigint;
  amountCents: number;
  platformAmountCents: number;
  providerAmountCents: number;
  customer: { name: string; email: string; cpf: string };
};
export type Charge = {
  id: string;
  order: { id: string };
  amount: number;
  status: string;
};
export type CreatedPayment = {
  orderId: string;
  chargeId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
  raw: { id: string; status: string };
};
export type Transfer = {
  id: string;
  externalId: string;
  amount: number;
  status:
    | 'PENDING'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REFUNDED';
};
export abstract class PaymentGateway {
  abstract readonly provider: string;
  abstract readonly simulated: boolean;
  abstract createPixPayment(input: GatewayInput): Promise<CreatedPayment>;
  abstract findPixPayment(input: GatewayInput): Promise<CreatedPayment | null>;
  abstract getCharge(id: string): Promise<Charge>;
  abstract refundPayment(id: string): Promise<void>;
  abstract sendTransfer(input: {
    externalId: string;
    amount: number;
    destination: PixDestination;
  }): Promise<Transfer>;
  abstract findTransfer(externalId: string): Promise<Transfer | null>;
}
