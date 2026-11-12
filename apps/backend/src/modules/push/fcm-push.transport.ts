import { Logger } from '@nestjs/common';
import { createSign } from 'node:crypto';

import {
  PushDeliveryResult,
  PushMessage,
  PushTransport,
} from './push-transport';

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const REQUEST_TIMEOUT_MS = 10_000;
/**
 * Códigos do FCM (`details[].errorCode`) que comprovam que o token não serve
 * mais para este projeto: app desinstalado ou token de outro remetente.
 */
const INVALID_TOKEN_CODES = new Set(['UNREGISTERED', 'SENDER_ID_MISMATCH']);
/** Campo apontado por `google.rpc.BadRequest` quando o token é malformado. */
const TOKEN_FIELD = 'message.token';

interface FcmErrorBody {
  error?: {
    status?: string;
    details?: Array<{
      errorCode?: string;
      fieldViolations?: Array<{ field?: string }>;
    }>;
  };
}

type Fetch = typeof fetch;

/**
 * Adapter da API HTTP v1 do Firebase Cloud Messaging. Autentica com a conta
 * de serviço (JWT assinado em RS256) sem depender do SDK firebase-admin.
 */
export class FcmPushTransport extends PushTransport {
  private readonly logger = new Logger(FcmPushTransport.name);
  private accessToken?: { value: string; expiresAt: number };

  constructor(
    private readonly account: FcmServiceAccount,
    private readonly http: Fetch = fetch,
  ) {
    super();
  }

  /** Aceita o JSON da conta de serviço puro ou em base64. */
  static parseServiceAccount(raw: string): FcmServiceAccount {
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(text) as Partial<FcmServiceAccount>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error(
        'FCM_SERVICE_ACCOUNT precisa de project_id, client_email e private_key',
      );
    }
    return parsed as FcmServiceAccount;
  }

  async send(
    tokens: string[],
    message: PushMessage,
  ): Promise<PushDeliveryResult> {
    const invalidTokens: string[] = [];
    if (tokens.length === 0) return { invalidTokens };
    const accessToken = await this.getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${this.account.project_id}/messages:send`;

    // Falha num aparelho não interrompe nem descarta o resultado dos outros.
    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const response = await this.http(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.data ?? {},
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) return;
        const error = await this.readError(response);
        if (this.provesTokenInvalid(error)) {
          invalidTokens.push(token);
          return;
        }
        this.logger.warn(
          `FCM recusou o envio para ${this.mask(token)} (HTTP ${response.status}, ${this.describe(error)})`,
        );
      }),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Falha ao enviar push para ${this.mask(tokens.at(index) ?? '')}: ${(result.reason as Error)?.name ?? 'erro'}`,
        );
      }
    });
    return { invalidTokens };
  }

  /**
   * Só remove o token quando o FCM aponta o próprio token: um código
   * específico de token, ou INVALID_ARGUMENT com violação no campo
   * `message.token`. INVALID_ARGUMENT sem isso pode ser erro de payload.
   */
  private provesTokenInvalid(error: FcmErrorBody | null): boolean {
    const details = error?.error?.details ?? [];
    if (
      details.some((d) => d.errorCode && INVALID_TOKEN_CODES.has(d.errorCode))
    )
      return true;
    return (
      error?.error?.status === 'INVALID_ARGUMENT' &&
      details.some((d) =>
        d.fieldViolations?.some((v) => v.field === TOKEN_FIELD),
      )
    );
  }

  private describe(error: FcmErrorBody | null): string {
    if (!error?.error) return 'resposta sem corpo de erro válido';
    const code = error.error.details?.find((d) => d.errorCode)?.errorCode;
    return [error.error.status, code].filter(Boolean).join('/') || 'sem código';
  }

  /** Nunca registra o token inteiro. */
  private mask(token: string): string {
    return `aparelho …${token.slice(-6)}`;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessToken.expiresAt - 60_000 > now) {
      return this.accessToken.value;
    }
    const response = await this.http(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.signAssertion(Math.floor(now / 1000)),
      }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Falha ao autenticar no FCM (${response.status})`);
    }
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!body.access_token) throw new Error('FCM não devolveu access_token');
    this.accessToken = {
      value: body.access_token,
      expiresAt: now + (body.expires_in ?? 3600) * 1000,
    };
    return body.access_token;
  }

  private signAssertion(issuedAt: number): string {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iss: this.account.client_email,
      scope: FCM_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    })}`;
    const signature = createSign('RSA-SHA256')
      .update(unsigned)
      .sign(this.account.private_key, 'base64url');
    return `${unsigned}.${signature}`;
  }

  private async readError(response: Response): Promise<FcmErrorBody | null> {
    try {
      const body = (await response.json()) as unknown;
      return body && typeof body === 'object' ? (body as FcmErrorBody) : null;
    } catch {
      return null;
    }
  }
}
