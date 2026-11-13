import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { CustomerAuthSession, PublicUserProfile } from '@taskgo/shared';
import { firstValueFrom } from 'rxjs';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { SessionStorage } from './session-storage';

interface TokenPair {
  readonly access_token: string;
  readonly refresh_token: string;
}

/** O app é do cliente; prestadores continuam no site. */
export class ProviderAccountError extends Error {
  constructor() {
    super('provider-account');
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #storage = inject(SessionStorage);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;

  readonly #accessToken = signal<string | null>(null);
  readonly #user = signal<PublicUserProfile | null>(null);
  #refreshToken: string | null = null;
  #refreshing: Promise<string | null> | null = null;
  #restoring: Promise<void> | null = null;

  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);

  /** Carrega a sessão salva. O access token vem do primeiro refresh, sob demanda. */
  restore(): Promise<void> {
    this.#restoring ??= this.#storage
      .load()
      .then((session) => {
        if (session && this.#refreshToken === null) {
          this.#refreshToken = session.refreshToken;
          this.#user.set(session.user);
        }
      })
      .catch(() => undefined);
    return this.#restoring;
  }

  async login(email: string, password: string): Promise<PublicUserProfile> {
    const session = await firstValueFrom(
      this.#http.post<CustomerAuthSession>(`${this.#apiUrl}/auth/login`, { email, password })
    );
    if (!isCustomer(session.user)) {
      if (session.refresh_token) this.#revoke(session.refresh_token);
      throw new ProviderAccountError();
    }
    if (!session.refresh_token) {
      throw new Error('A API não devolveu refresh_token.');
    }
    await this.#storage.save({ refreshToken: session.refresh_token, user: session.user });
    this.#refreshToken = session.refresh_token;
    this.#accessToken.set(session.access_token);
    this.#user.set(session.user);
    return session.user;
  }

  /** Token para uma requisição: o atual, ou um novo se só houver refresh token. */
  async accessToken(): Promise<string | null> {
    await this.restore();
    return this.#accessToken() ?? (this.#refreshToken ? this.refresh() : null);
  }

  /**
   * Chamado quando a API recusou `rejected` com 401. Se outra requisição já
   * renovou o par nesse meio-tempo, usa o token novo sem renovar de novo.
   */
  async accessTokenAfterRejection(rejected: string): Promise<string | null> {
    const current = this.#accessToken();
    if (current && current !== rejected) return current;
    return this.refresh();
  }

  /**
   * Renova o par uma vez só, mesmo com várias requisições pedindo juntas: a API
   * rotaciona o refresh token e recusa o mesmo token usado duas vezes.
   */
  refresh(): Promise<string | null> {
    this.#refreshing ??= this.#rotate().finally(() => (this.#refreshing = null));
    return this.#refreshing;
  }

  async logout(): Promise<void> {
    // Espera uma renovação em curso para encerrar a sessão com o token mais novo.
    await this.#refreshing?.catch(() => null);
    const token = this.#refreshToken;
    await this.#clearLocal();
    if (token) this.#revoke(token);
  }

  async #rotate(): Promise<string | null> {
    const used = this.#refreshToken;
    if (!used) return null;
    let pair: TokenPair;
    try {
      pair = await firstValueFrom(
        this.#http.post<TokenPair>(`${this.#apiUrl}/auth/refresh`, { refresh_token: used })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 400)) {
        if (this.#refreshToken === used) await this.#clearLocal();
        return null;
      }
      throw error;
    }
    // Logout ou novo login durante a renovação: o par novo não pertence mais a ninguém.
    if (this.#refreshToken !== used) return this.#accessToken();
    const user = this.#user();
    if (user) await this.#storage.save({ refreshToken: pair.refresh_token, user });
    this.#refreshToken = pair.refresh_token;
    this.#accessToken.set(pair.access_token);
    return pair.access_token;
  }

  async #clearLocal(): Promise<void> {
    this.#refreshToken = null;
    this.#accessToken.set(null);
    this.#user.set(null);
    await this.#storage.clear().catch(() => undefined);
  }

  #revoke(refreshToken: string): void {
    this.#http
      .post(`${this.#apiUrl}/auth/logout`, { refresh_token: refreshToken })
      .subscribe({ error: () => undefined });
  }
}

function isCustomer(user: PublicUserProfile): boolean {
  return user.type === 'CLIENTE' || user.type === 'CUSTOMER';
}
