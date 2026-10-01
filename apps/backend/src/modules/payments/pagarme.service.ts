import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

import {
  mapGatewayError,
  TaskGoGatewayError,
} from './pagarme-payout-capabilities.contract';

export type GatewayInput = {
  idempotencyKey: string;
  orderId: bigint;
  amountCents: number;
  platformAmountCents: number;
  providerAmountCents: number;
  providerRecipientId: string;
  platformRecipientId?: string;
  customer: { name: string; email: string; cpf: string };
  card?: {
    number: string;
    holderName: string;
    expMonth: number;
    expYear: number;
    cvv: string;
  };
};

export type RecipientBankAccountInput = {
  holderName: string;
  holderType: 'individual' | 'company';
  holderDocument: string;
  bank: string;
  branchNumber: string;
  branchCheckDigit?: string | null;
  accountNumber: string;
  accountCheckDigit: string;
  type: 'checking' | 'savings';
};

export type RecipientInput = {
  idempotencyKey: string;
  code: string;
  name: string;
  email: string;
  document: string;
  type: 'individual' | 'company';
  phone?: { ddd: string; number: string } | null;
  bankAccount: RecipientBankAccountInput;
};

/** Minimal recipient metadata; never carries bank or document values. */
export type RecipientResult = {
  recipientId: string;
  status: string | null;
  bankStatus: string | null;
};

export class PagarmeGatewayException extends BadGatewayException {
  constructor(
    message: string,
    readonly category: TaskGoGatewayError,
  ) {
    super(message);
  }
}

@Injectable()
export class PagarmeService {
  private readonly baseUrl: string;
  private readonly secretKey: string;
  readonly simulated: boolean;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('payment.baseUrl');
    this.secretKey = this.configService.get<string>('payment.secretKey') ?? '';
    this.simulated =
      this.configService.getOrThrow<boolean>('payment.simulated');
  }

  async createPixPayment(input: GatewayInput) {
    if (this.simulated) {
      const id = `ch_sim_${randomUUID()}`;
      return {
        orderId: `or_sim_${randomUUID()}`,
        chargeId: id,
        status: 'pending',
        qrCode: `000201-PROXI-${input.orderId}-${id}`,
        qrCodeBase64: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        raw: { simulated: true, id },
      };
    }
    return this.createOrder(input, {
      payment_method: 'pix',
      pix: { expires_in: 3600 },
    });
  }

  async authorizeCardPayment(_input: GatewayInput) {
    throw new BadGatewayException(
      'Pagamento por cartão indisponível até homologação da tokenização',
    );
  }

  async capturePayment(providerChargeId: string, amount: number) {
    if (this.simulated)
      return {
        id: providerChargeId,
        status: 'paid',
        paid_at: new Date().toISOString(),
        simulated: true,
      };
    return this.request(`/charges/${providerChargeId}/capture`, {
      method: 'POST',
      body: { amount: Math.round(amount * 100) },
      idempotencyKey: `capture-${providerChargeId}`,
    });
  }

  async cancelPayment(providerChargeId: string) {
    if (this.simulated)
      return { id: providerChargeId, status: 'canceled', simulated: true };
    return this.request(`/charges/${providerChargeId}`, {
      method: 'DELETE',
      idempotencyKey: `cancel-${providerChargeId}`,
    });
  }

  async refundPayment(providerChargeId: string) {
    return this.cancelPayment(providerChargeId);
  }
  async getCharge(providerChargeId: string) {
    if (this.simulated)
      return { id: providerChargeId, status: 'pending', simulated: true };
    return this.request(`/charges/${providerChargeId}`);
  }
  async createRecipient(input: RecipientInput): Promise<RecipientResult> {
    if (this.simulated)
      return {
        recipientId: `re_sim_${randomUUID().replace(/-/g, '')}`,
        status: 'active',
        bankStatus: 'active',
      };
    const raw: any = await this.request('/recipients', {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        code: input.code,
        register_information: {
          type: input.type,
          document: input.document,
          email: input.email,
          ...(input.type === 'company'
            ? { company_name: input.name, trading_name: input.name }
            : { name: input.name }),
          ...(input.phone
            ? {
                phone_numbers: [
                  {
                    ddd: input.phone.ddd,
                    number: input.phone.number,
                    type: 'mobile',
                  },
                ],
              }
            : {}),
        },
        default_bank_account: this.toBankAccountBody(input.bankAccount),
      },
    });
    return this.toRecipientResult(raw);
  }

  async updateRecipientBankAccount(
    recipientId: string,
    bankAccount: RecipientBankAccountInput,
    idempotencyKey: string,
  ): Promise<RecipientResult> {
    if (this.simulated)
      return { recipientId, status: 'active', bankStatus: 'active' };
    const raw: any = await this.request(
      `/recipients/${recipientId}/default-bank-account`,
      {
        method: 'PATCH',
        idempotencyKey,
        body: { bank_account: this.toBankAccountBody(bankAccount) },
      },
    );
    return this.toRecipientResult(raw, recipientId);
  }

  async getRecipient(recipientId: string): Promise<RecipientResult> {
    if (this.simulated)
      return { recipientId, status: 'active', bankStatus: 'active' };
    const raw: any = await this.request(`/recipients/${recipientId}`);
    return this.toRecipientResult(raw, recipientId);
  }

  private toBankAccountBody(account: RecipientBankAccountInput) {
    return {
      holder_name: account.holderName,
      holder_type: account.holderType,
      holder_document: account.holderDocument,
      bank: account.bank,
      branch_number: account.branchNumber,
      ...(account.branchCheckDigit
        ? { branch_check_digit: account.branchCheckDigit }
        : {}),
      account_number: account.accountNumber,
      account_check_digit: account.accountCheckDigit,
      type: account.type,
    };
  }

  private toRecipientResult(raw: any, fallbackId?: string): RecipientResult {
    const recipientId =
      typeof raw?.id === 'string' && raw.id.startsWith('re_')
        ? raw.id
        : fallbackId;
    if (!recipientId)
      throw new PagarmeGatewayException(
        'Resposta do gateway sem identificador de recebedor',
        'UNKNOWN',
      );
    return {
      recipientId,
      status: typeof raw?.status === 'string' ? raw.status : null,
      bankStatus:
        typeof raw?.default_bank_account?.status === 'string'
          ? raw.default_bank_account.status
          : null,
    };
  }

  private async createOrder(input: GatewayInput, payment: Record<string, any>) {
    const split = [
      {
        amount: input.providerAmountCents,
        recipient_id: input.providerRecipientId,
        type: 'flat',
        options: { liable: true, charge_processing_fee: true },
      },
    ];
    if (input.platformRecipientId)
      split.push({
        amount: input.platformAmountCents,
        recipient_id: input.platformRecipientId,
        type: 'flat',
        options: { liable: false, charge_processing_fee: false },
      });
    const raw: any = await this.request('/orders', {
      method: 'POST',
      idempotencyKey: input.idempotencyKey,
      body: {
        code: input.orderId.toString(),
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          document: input.customer.cpf.replace(/\D/g, ''),
          type: 'individual',
        },
        items: [
          {
            amount: input.amountCents,
            description: `Pedido Proxi #${input.orderId}`,
            quantity: 1,
            code: input.orderId.toString(),
          },
        ],
        payments: [{ ...payment, split }],
      },
    });
    const charge = raw.charges?.[0] ?? {};
    if (!raw.id || !charge.id || charge.amount !== input.amountCents)
      throw new BadGatewayException(
        'Resposta financeira divergente; conciliação necessária',
      );
    const transaction = charge.last_transaction ?? {};
    return {
      orderId: raw.id,
      chargeId: charge.id,
      status: charge.status,
      qrCode: transaction.qr_code,
      qrCodeBase64: transaction.qr_code_url ?? transaction.qr_code_base64,
      expiresAt: transaction.expires_at
        ? new Date(transaction.expires_at)
        : null,
      raw: { id: raw.id, chargeId: charge.id, status: charge.status },
    };
  }

  private async request(
    path: string,
    init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
  ) {
    if (!this.secretKey)
      throw new PagarmeGatewayException(
        'Gateway não configurado',
        'AUTHENTICATION',
      );
    if (
      !/^\/(orders|charges\/ch_[a-zA-Z0-9]+(?:\/capture)?|recipients(?:\/re_[a-zA-Z0-9]+(?:\/default-bank-account)?)?)$/.test(
        path,
      )
    )
      throw new PagarmeGatewayException(
        'Recurso financeiro inválido',
        'VALIDATION',
      );
    const response = await fetch(`${this.baseUrl}${path}`, {
      signal: AbortSignal.timeout(15000),
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...(init.idempotencyKey
          ? { 'Idempotency-key': init.idempotencyKey }
          : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    }).catch(() => {
      throw new PagarmeGatewayException(
        'Gateway indisponível; consulte o pagamento antes de tentar novamente',
        'TRANSIENT',
      );
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new PagarmeGatewayException(
        'Não foi possível processar o pagamento no gateway',
        mapGatewayError(response.status),
      );
    return data;
  }
}
