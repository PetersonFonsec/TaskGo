import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  CreatedPayment,
  GatewayInput,
  PaymentGateway,
  PixDestination,
  Transfer,
} from './payment-gateway';

type Resource = Record<string, any>;

/** REST v2 adapter. No business rule outside this file depends on AbacatePay fields. */
@Injectable()
export class AbacatePayService extends PaymentGateway {
  readonly provider = 'ABACATEPAY';
  readonly simulated: boolean;
  constructor(private readonly config: ConfigService) {
    super();
    this.simulated = config.getOrThrow<boolean>('payment.simulated');
  }
  async createPixPayment(input: GatewayInput): Promise<CreatedPayment> {
    if (this.simulated) {
      const id = `pix_sim_${randomUUID()}`;
      return this.created(
        {
          id,
          amount: input.amountCents,
          status: 'PENDING',
          brCode: `SIMULACAO-${id}`,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
        input,
      );
    }
    const { data } = await this.request('/transparents/create', {
      method: 'PIX',
      data: {
        amount: input.amountCents,
        expiresIn: 3600,
        description: `Pedido TaskGo #${input.orderId}`,
        externalId: input.idempotencyKey,
        metadata: {
          orderId: input.orderId.toString(),
          attemptKey: input.idempotencyKey,
        },
      },
    });
    return this.created(data, input);
  }
  async findPixPayment(input: GatewayInput): Promise<CreatedPayment | null> {
    if (this.simulated) return null;
    const data = await this.findTransparent(
      (item) => item.metadata?.attemptKey === input.idempotencyKey,
      { externalId: input.idempotencyKey },
    );
    return data ? this.created(data, input) : null;
  }
  async getCharge(id: string) {
    this.assertId(id);
    // /check omits amount. Fetch the original resource as well so reconciliation
    // never invents a provider amount from the local payment record.
    const original = await this.findTransparent((item) => item.id === id, {
      id,
    });
    if (!original || !Number.isSafeInteger(original.amount)) this.invalid();
    const { data } = await this.request(
      `/transparents/check?id=${encodeURIComponent(id)}`,
    );
    if (data?.id !== id) this.invalid();
    return {
      id,
      order: { id },
      amount: original!.amount as number,
      status: this.status(
        original!.status === 'REFUNDED' ? 'REFUNDED' : data.status,
      ),
    };
  }
  async refundPayment(id: string): Promise<void> {
    this.assertId(id);
    if (this.simulated) return;
    const { data } = await this.request('/transparents/refund', {
      id,
      reason: 'Cancelamento do pedido',
    });
    if (typeof data?.refundPublicId !== 'string') this.invalid();
    // Acceptance is not completion. The caller reconciles before marking refunded.
  }
  async sendTransfer(input: {
    externalId: string;
    amount: number;
    destination: PixDestination;
  }): Promise<Transfer> {
    if (!Number.isSafeInteger(input.amount) || input.amount < 100)
      this.invalid();
    if (this.simulated)
      return {
        id: `txn_sim_${input.externalId}`,
        externalId: input.externalId,
        amount: input.amount,
        status: 'COMPLETE',
      };
    const { data } = await this.request('/pix/send', {
      externalId: input.externalId,
      amount: input.amount,
      description: 'Repasse de serviço TaskGo',
      pix: input.destination,
    });
    return this.transfer(data);
  }
  async findTransfer(externalId: string): Promise<Transfer | null> {
    if (this.simulated) return null;
    const result = await this.request(
      `/pix/get?externalId=${encodeURIComponent(externalId)}`,
      undefined,
      true,
    );
    return result ? this.transfer(result.data) : null;
  }
  private transfer(data: Resource): Transfer {
    if (
      !data ||
      typeof data.id !== 'string' ||
      typeof data.externalId !== 'string' ||
      !Number.isSafeInteger(data.amount) ||
      ![
        'PENDING',
        'COMPLETE',
        'FAILED',
        'CANCELLED',
        'EXPIRED',
        'REFUNDED',
      ].includes(data.status)
    )
      this.invalid();
    return {
      id: data.id,
      externalId: data.externalId,
      amount: data.amount,
      status: data.status,
    };
  }
  private created(data: Resource, input: GatewayInput): CreatedPayment {
    if (
      !data ||
      typeof data.id !== 'string' ||
      data.amount !== input.amountCents ||
      typeof data.brCode !== 'string'
    )
      this.invalid();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) this.invalid();
    return {
      orderId: data.id,
      chargeId: data.id,
      status: this.status(data.status),
      qrCode: data.brCode,
      qrCodeBase64: data.brCodeBase64 ?? null,
      expiresAt,
      raw: { id: data.id, status: data.status },
    };
  }
  private status(status: string): string {
    const states: Record<string, string> = {
      PENDING: 'pending',
      PAID: 'paid',
      EXPIRED: 'canceled',
      CANCELLED: 'canceled',
      REFUNDED: 'refunded',
      FAILED: 'failed',
    };
    if (!states[status]) this.invalid();
    return states[status];
  }
  private async findTransparent(
    matches: (item: Resource) => boolean,
    filter: Record<string, string>,
  ): Promise<Resource | null> {
    let after: string | undefined;
    for (let page = 0; page < 20; page++) {
      const query = new URLSearchParams({
        ...filter,
        ...(after ? { after } : {}),
      });
      const response = await this.request(`/transparents/list?${query}`);
      if (!Array.isArray(response.data)) this.invalid();
      const found = response.data.find(matches);
      if (found) return found;
      if (!response.pagination?.hasMore) return null;
      const next = response.pagination.next;
      if (typeof next !== 'string' || next === after) this.invalid();
      after = next;
    }
    throw new BadGatewayException(
      'Conciliação excedeu o limite de páginas; revisão necessária',
    );
  }
  private assertId(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) this.invalid();
  }
  private invalid(): never {
    throw new BadGatewayException(
      'Resposta financeira divergente; conciliação necessária',
    );
  }
  private async request(
    path: string,
    body?: unknown,
    allowNotFound = false,
  ): Promise<any> {
    const key = this.config.get<string>('payment.secretKey');
    if (!key) throw new BadGatewayException('AbacatePay não configurado');
    const response = await fetch(`https://api.abacatepay.com/v2${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    }).catch(() => {
      throw new BadGatewayException(
        'Gateway indisponível; conciliação necessária',
      );
    });
    if (allowNotFound && response.status === 404) return null;
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success || result.error || result.data == null)
      throw new BadGatewayException(
        'AbacatePay não confirmou a operação; conciliação necessária',
      );
    if (
      !this.config.get<boolean>('payment.devMode') &&
      (result.data.devMode === true ||
        (Array.isArray(result.data) &&
          result.data.some((item: Resource) => item.devMode === true)))
    )
      throw new BadGatewayException(
        'Resposta de desenvolvimento em ambiente de pagamentos reais',
      );
    return result;
  }
}
