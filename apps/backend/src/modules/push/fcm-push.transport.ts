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
/** Erros do FCM que significam que o token não serve mais. */
const INVALID_TOKEN_ERRORS = new Set(['UNREGISTERED', 'INVALID_ARGUMENT']);

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

    await Promise.all(
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
        const status = await this.readErrorStatus(response);
        if (status && INVALID_TOKEN_ERRORS.has(status)) {
          invalidTokens.push(token);
          return;
        }
        this.logger.warn(
          `FCM recusou o envio (${response.status} ${status ?? 'sem código'})`,
        );
      }),
    );
    return { invalidTokens };
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

  private async readErrorStatus(response: Response): Promise<string | null> {
    try {
      const body = (await response.json()) as {
        error?: {
          status?: string;
          details?: Array<{ errorCode?: string }>;
        };
      };
      const fcmCode = body.error?.details?.find((d) => d.errorCode)?.errorCode;
      return fcmCode ?? body.error?.status ?? null;
    } catch {
      return null;
    }
  }
}
