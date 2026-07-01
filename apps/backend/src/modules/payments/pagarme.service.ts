import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

type GatewayInput = {
  orderId: bigint;
  amountCents: number;
  platformAmountCents: number;
  providerAmountCents: number;
  providerRecipientId: string;
  platformRecipientId?: string;
  customer: { name: string; email: string; cpf: string };
  card?: { number: string; holderName: string; expMonth: number; expYear: number; cvv: string };
};

@Injectable()
export class PagarmeService {
  private readonly baseUrl = process.env.PAGARME_BASE_URL || 'https://api.pagar.me/core/v5';
  private readonly secretKey = process.env.PAGARME_SECRET_KEY || '';
  readonly simulated = process.env.PAYMENTS_SIMULATION === 'true' || !this.secretKey || this.secretKey.includes('xxx');

  async createPixPayment(input: GatewayInput) {
    if (this.simulated) {
      const id = `ch_sim_${randomUUID()}`;
      return { orderId: `or_sim_${randomUUID()}`, chargeId: id, status: 'pending',
        qrCode: `000201-PROXI-${input.orderId}-${id}`, qrCodeBase64: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), raw: { simulated: true, id } };
    }
    return this.createOrder(input, { payment_method: 'pix', pix: { expires_in: 3600 } });
  }

  async authorizeCardPayment(input: GatewayInput) {
    if (!input.card) throw new BadGatewayException('Dados do cartão não informados');
    if (this.simulated) {
      const id = `ch_sim_${randomUUID()}`;
      return { orderId: `or_sim_${randomUUID()}`, chargeId: id, status: 'authorized_pending_capture',
        qrCode: null, qrCodeBase64: null, expiresAt: null, raw: { simulated: true, id } };
    }
    return this.createOrder(input, {
      payment_method: 'credit_card',
      credit_card: {
        operation_type: 'auth_only', installments: 1,
        card: { number: input.card.number, holder_name: input.card.holderName,
          exp_month: input.card.expMonth, exp_year: input.card.expYear, cvv: input.card.cvv },
      },
    });
  }

  async capturePayment(providerChargeId: string, amount: number) {
    if (this.simulated || providerChargeId.startsWith('ch_sim_')) return { id: providerChargeId, status: 'paid', paid_at: new Date().toISOString(), simulated: true };
    return this.request(`/charges/${providerChargeId}/capture`, { method: 'POST', body: { amount: Math.round(amount * 100) } });
  }

  async cancelPayment(providerChargeId: string) {
    if (this.simulated) return { id: providerChargeId, status: 'canceled', simulated: true };
    return this.request(`/charges/${providerChargeId}`, { method: 'DELETE' });
  }

  async refundPayment(providerChargeId: string) { return this.cancelPayment(providerChargeId); }
  async getCharge(providerChargeId: string) {
    if (this.simulated) return { id: providerChargeId, status: 'pending', simulated: true };
    return this.request(`/charges/${providerChargeId}`);
  }
  handleWebhook(payload: unknown) { return payload; }

  private async createOrder(input: GatewayInput, payment: Record<string, any>) {
    const split = [
      { amount: input.providerAmountCents, recipient_id: input.providerRecipientId, type: 'flat', options: { liable: true, charge_processing_fee: true } },
    ];
    if (input.platformRecipientId) split.push({ amount: input.platformAmountCents, recipient_id: input.platformRecipientId, type: 'flat', options: { liable: false, charge_processing_fee: false } });
    const raw: any = await this.request('/orders', { method: 'POST', body: {
      code: input.orderId.toString(),
      customer: { name: input.customer.name, email: input.customer.email, document: input.customer.cpf.replace(/\D/g, ''), type: 'individual' },
      items: [{ amount: input.amountCents, description: `Pedido Proxi #${input.orderId}`, quantity: 1, code: input.orderId.toString() }],
      payments: [{ ...payment, split }],
    } });
    const charge = raw.charges?.[0] ?? {};
    const transaction = charge.last_transaction ?? {};
    return { orderId: raw.id, chargeId: charge.id, status: charge.status,
      qrCode: transaction.qr_code, qrCodeBase64: transaction.qr_code_url ?? transaction.qr_code_base64,
      expiresAt: transaction.expires_at ? new Date(transaction.expires_at) : null, raw };
  }

  private async request(path: string, init: { method?: string; body?: unknown } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new BadGatewayException('Não foi possível processar o pagamento no gateway');
    return data;
  }
}
