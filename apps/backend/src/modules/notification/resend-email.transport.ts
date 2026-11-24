import { randomUUID } from 'node:crypto';

import { EmailMessage, EmailTransport } from './email-transport';

export interface ResendTransportOptions {
  replyTo?: string;
  /** Sobrescrito apenas nos testes. */
  baseUrl?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/** Erro da API do Resend sem destinatário nem corpo, seguro para logs. */
export class ResendDeliveryError extends Error {
  constructor(
    readonly status: number | null,
    readonly code: string,
  ) {
    super(`Resend recusou o e-mail (${status ?? 'sem resposta'}: ${code})`);
    this.name = 'ResendDeliveryError';
  }
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const TAG_VALUE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * Entrega pela API HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Repete falhas transitórias (timeout, 429 e 5xx) com a mesma Idempotency-Key,
 * então uma retentativa nunca duplica o e-mail.
 */
export class ResendEmailTransport extends EmailTransport {
  readonly configured = true;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly options: ResendTransportOptions = {},
  ) {
    super();
    this.baseUrl = (options.baseUrl ?? 'https://api.resend.com').replace(
      /\/+$/,
      '',
    );
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(message: EmailMessage): Promise<void> {
    const body = JSON.stringify({
      from: this.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      ...(this.options.replyTo ? { reply_to: this.options.replyTo } : {}),
      ...(message.category && TAG_VALUE.test(message.category)
        ? { tags: [{ name: 'category', value: message.category }] }
        : {}),
    });
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': (message.idempotencyKey ?? randomUUID()).slice(0, 256),
    };

    let lastError: ResendDeliveryError = new ResendDeliveryError(
      null,
      'not_sent',
    );
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let response: Response;
      try {
        response = await this.fetchFn(`${this.baseUrl}/emails`, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (error) {
        lastError = new ResendDeliveryError(
          null,
          (error as Error)?.name === 'TimeoutError' ? 'timeout' : 'network',
        );
        if (attempt < this.maxAttempts) await this.sleep(this.backoff(attempt));
        continue;
      }
      if (response.ok) return;

      lastError = new ResendDeliveryError(
        response.status,
        await this.errorCode(response),
      );
      if (!RETRYABLE_STATUS.has(response.status)) throw lastError;
      if (attempt < this.maxAttempts)
        await this.sleep(this.backoff(attempt, response));
    }
    throw lastError;
  }

  private backoff(attempt: number, response?: Response): number {
    const retryAfter = Number(response?.headers.get('retry-after'));
    if (Number.isFinite(retryAfter) && retryAfter > 0)
      return Math.min(retryAfter * 1000, 5000);
    return Math.min(250 * 2 ** (attempt - 1), 2000);
  }

  /** Só o nome do erro (ex.: validation_error): a mensagem pode citar o destinatário. */
  private async errorCode(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { name?: unknown };
      return typeof payload?.name === 'string' ? payload.name : 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
