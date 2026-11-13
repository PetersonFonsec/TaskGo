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

/** Resultado de uma renovação, marcado com a geração de sessão que a pediu. */
interface Rotation {
  readonly generation: number;
  /** null quando a API recusou o refresh token. */
  readonly pair: TokenPair | null;
}

/** Token de acesso junto com a geração de sessão a que pertence. */
export interface Credentials {
  readonly token: string | null;
  readonly generation: number;
}

/**
 * `revoked`: a API confirmou. `unconfirmed`: sem resposta definitiva (rede,
 * 429 ou 5xx); a sessão pode continuar ativa no servidor. `rejected`: a API
 * recusou o token em definitivo, então não há o que revogar.
 */
export type RevocationOutcome = 'revoked' | 'unconfirmed' | 'rejected';

/**
 * Como uma revogação não confirmada será tentada de novo.
 * `durable`: a pendência está no armazenamento seguro e sobrevive a reinícios.
 * `memory`: o armazenamento falhou; só este processo tenta de novo, e a
 * tentativa se perde se o app for encerrado antes.
 * `none`: nada a repetir (confirmada, recusada ou sem sessão).
 */
export type RevocationRetry = 'durable' | 'memory' | 'none';

/**
 * Os três estados do logout, que podem divergir: memória (sempre limpa na hora),
 * armazenamento seguro (`localCleared`, `pendingPersisted`) e servidor (`remote`).
 */
export interface LogoutResult {
  readonly remote: RevocationOutcome | 'none';
  readonly retry: RevocationRetry;
  /** A revogação pendente foi gravada no armazenamento seguro. */
  readonly pendingPersisted: boolean;
  /** false se o armazenamento seguro falhou ao apagar a sessão salva. */
  readonly localCleared: boolean;
}

interface PendingEntry {
  readonly id: string;
  readonly refreshToken: string;
}

/** O app é do cliente; prestadores continuam no site. */
export class ProviderAccountError extends Error {
  constructor() {
    super('provider-account');
  }
}

/**
 * Sessão do cliente. Cada login, logout, restauração ou perda da sessão cria uma
 * nova geração; uma operação assíncrona só altera o estado (memória e
 * armazenamento) se a geração em que começou ainda for a atual. Assim nada que
 * termine atrasado reaplica uma sessão antiga ou apaga a de um login novo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #storage = inject(SessionStorage);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;

  readonly #accessToken = signal<string | null>(null);
  readonly #user = signal<PublicUserProfile | null>(null);
  #generation = 0;
  #sessionId: string | null = null;
  #refreshToken: string | null = null;
  #refreshing: { readonly generation: number; readonly promise: Promise<Rotation> } | null = null;
  #restoring: Promise<void> | null = null;
  #flushing: Promise<void> | null = null;
  /** Revogações não confirmadas que o armazenamento não conseguiu gravar. */
  readonly #unsaved = new Map<string, string>();

  /** Espelho reativo de `#generation`, para telas que exibem dados da conta. */
  readonly #session = signal(0);

  readonly user = this.#user.asReadonly();
  readonly isAuthenticated = computed(() => this.#user() !== null);
  /** Muda junto com `generation()`; dados privados devem ser descartados quando muda. */
  readonly session = this.#session.asReadonly();

  /** Identifica a sessão atual; muda a cada login, logout ou restauração. */
  generation(): number {
    return this.#generation;
  }

  /** Carrega a sessão salva. O access token vem do primeiro refresh, sob demanda. */
  restore(): Promise<void> {
    if (!this.#restoring) {
      const generation = this.#generation;
      this.#restoring = this.#storage
        .load()
        .then((session) => {
          // Login ou logout durante a leitura: a sessão lida já não vale. E uma
          // sessão já em memória (login antes do restore) nunca é substituída.
          if (!session || generation !== this.#generation || this.#sessionId !== null) return;
          this.#apply(session.id, session.refreshToken, null, session.user);
        })
        .catch(() => undefined);
    }
    return this.#restoring;
  }

  async login(email: string, password: string): Promise<PublicUserProfile> {
    const session = await firstValueFrom(
      this.#http.post<CustomerAuthSession>(`${this.#apiUrl}/auth/login`, { email, password })
    );
    const refreshToken = session.refresh_token;
    if (!isCustomer(session.user)) {
      if (refreshToken) await this.#endRemoteSession({ id: newSessionId(), refreshToken });
      throw new ProviderAccountError();
    }
    if (!refreshToken) {
      throw new Error('A API não devolveu refresh_token.');
    }
    const id = newSessionId();
    const generation = this.#apply(id, refreshToken, session.access_token, session.user);
    try {
      await this.#storage.save({ id, refreshToken, user: session.user });
    } catch (error) {
      // Sem a sessão salva, o login não se sustenta: desfaz e encerra na API.
      if (generation === this.#generation) this.#discard();
      await this.#endRemoteSession({ id, refreshToken });
      throw error;
    }
    void this.flushPendingRevocations();
    return session.user;
  }

  /** Token atual, ou um novo se só houver refresh token. */
  async accessToken(): Promise<string | null> {
    return (await this.credentials()).token;
  }

  async credentials(): Promise<Credentials> {
    await this.restore();
    const generation = this.#generation;
    const token = this.#accessToken() ?? (this.#refreshToken ? await this.refresh() : null);
    return { token: generation === this.#generation ? token : null, generation };
  }

  /**
   * Chamado quando a API recusou `rejected` com 401. Se outra requisição da mesma
   * sessão já renovou o par, usa o token novo sem renovar de novo. Se a sessão
   * mudou, devolve null: uma requisição feita por uma conta nunca é repetida
   * com as credenciais de outra.
   */
  async accessTokenAfterRejection(rejected: string, generation: number): Promise<string | null> {
    if (generation !== this.#generation) return null;
    const current = this.#accessToken();
    if (current && current !== rejected) return current;
    return this.refresh();
  }

  /**
   * Renova o par uma vez só por sessão, mesmo com várias requisições pedindo
   * juntas: a API rotaciona o refresh token e recusa o mesmo token usado duas vezes.
   */
  async refresh(): Promise<string | null> {
    const rotation = await this.#rotation().promise;
    return rotation.generation === this.#generation && rotation.pair
      ? rotation.pair.access_token
      : null;
  }

  /**
   * Encerra a sessão. O app deixa de usá-la na hora; depois espera uma renovação
   * em curso para revogar o token mais novo e aguarda a resposta da API.
   */
  async logout(): Promise<LogoutResult> {
    const inflight =
      this.#refreshing?.generation === this.#generation ? this.#refreshing.promise : null;
    const id = this.#sessionId;
    const token = this.#refreshToken;
    this.#discard();
    if (!id || !token) {
      return { remote: 'none', retry: 'none', pendingPersisted: false, localCleared: true };
    }

    // Na fila do armazenamento, antes de qualquer login posterior.
    const local = this.#storage
      .endSession({ id, refreshToken: token })
      .catch(() => ({ pendingPersisted: false, sessionRemoved: false }));
    const rotation = await inflight?.catch(() => null);
    const newest = rotation?.pair?.refresh_token ?? token;
    const { pendingPersisted, sessionRemoved } = await local;
    const remote = await this.#settle({ id, refreshToken: newest }, pendingPersisted);
    return {
      remote,
      retry: remote !== 'unconfirmed' ? 'none' : pendingPersisted ? 'durable' : 'memory',
      pendingPersisted,
      localCleared: sessionRemoved
    };
  }

  /** Reenvia as revogações pendentes uma vez (abertura do app, volta da rede). */
  flushPendingRevocations(): Promise<void> {
    this.#flushing ??= this.#flush().finally(() => (this.#flushing = null));
    return this.#flushing;
  }

  async #flush(): Promise<void> {
    const stored = await this.#storage
      .pendingRevocations()
      .catch((): readonly PendingEntry[] => []);
    for (const entry of stored) {
      await this.#settle(entry, true);
    }
    for (const [id, refreshToken] of [...this.#unsaved]) {
      if (stored.some((entry) => entry.id === id)) continue;
      const outcome = await this.#settle({ id, refreshToken }, false);
      // Se o armazenamento voltou, a pendência passa a sobreviver a reinícios.
      if (outcome === 'unconfirmed') {
        const persisted = await this.#storage.addPending({ id, refreshToken }).then(
          () => true,
          () => false
        );
        if (persisted) this.#unsaved.delete(id);
      }
    }
  }

  #rotation(): { readonly generation: number; readonly promise: Promise<Rotation> } {
    const generation = this.#generation;
    if (this.#refreshing?.generation !== generation) {
      const entry = { generation, promise: this.#rotate(generation) };
      this.#refreshing = entry;
      entry.promise
        .finally(() => {
          if (this.#refreshing === entry) this.#refreshing = null;
        })
        .catch(() => undefined);
    }
    return this.#refreshing!;
  }

  async #rotate(generation: number): Promise<Rotation> {
    const used = this.#refreshToken;
    const id = this.#sessionId;
    const user = this.#user();
    if (!used || !id) return { generation, pair: null };
    let pair: TokenPair;
    try {
      pair = await firstValueFrom(
        this.#http.post<TokenPair>(`${this.#apiUrl}/auth/refresh`, { refresh_token: used })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 400)) {
        if (generation === this.#generation) {
          this.#discard();
          await this.#storage.removeSession(id).catch(() => undefined);
        }
        return { generation, pair: null };
      }
      throw error;
    }
    // Só a sessão atual grava; o par de uma sessão encerrada vai para o logout.
    if (generation === this.#generation && user) {
      this.#refreshToken = pair.refresh_token;
      this.#accessToken.set(pair.access_token);
      await this.#storage
        .save({ id, refreshToken: pair.refresh_token, user })
        .catch(() => undefined);
    }
    return { generation, pair };
  }

  /** Registra a pendência, tenta revogar e, se a API respondeu, tira a pendência. */
  async #endRemoteSession(pending: PendingEntry): Promise<RevocationOutcome> {
    const { pendingPersisted } = await this.#storage
      .endSession(pending)
      .catch(() => ({ pendingPersisted: false }));
    return this.#settle(pending, pendingPersisted);
  }

  /**
   * Tenta revogar. Com resposta definitiva, tira a pendência (gravada ou em
   * memória). Sem resposta, uma pendência que o armazenamento não gravou fica
   * em memória para este processo tentar de novo.
   */
  async #settle(pending: PendingEntry, persisted: boolean): Promise<RevocationOutcome> {
    const outcome = await this.#revoke(pending.refreshToken);
    if (outcome === 'unconfirmed') {
      if (!persisted) this.#unsaved.set(pending.id, pending.refreshToken);
      return outcome;
    }
    this.#unsaved.delete(pending.id);
    if (persisted) await this.#storage.removePending(pending.id).catch(() => undefined);
    return outcome;
  }

  async #revoke(refreshToken: string): Promise<RevocationOutcome> {
    try {
      await firstValueFrom(
        this.#http.post(`${this.#apiUrl}/auth/logout`, { refresh_token: refreshToken })
      );
      return 'revoked';
    } catch (error) {
      // 400: o token nem tem formato válido; a API nunca vai aceitá-lo.
      return error instanceof HttpErrorResponse && error.status === 400 ? 'rejected' : 'unconfirmed';
    }
  }

  #apply(
    id: string,
    refreshToken: string,
    accessToken: string | null,
    user: PublicUserProfile
  ): number {
    this.#session.set(++this.#generation);
    this.#sessionId = id;
    this.#refreshToken = refreshToken;
    this.#accessToken.set(accessToken);
    this.#user.set(user);
    return this.#generation;
  }

  #discard(): void {
    this.#session.set(++this.#generation);
    this.#sessionId = null;
    this.#refreshToken = null;
    this.#accessToken.set(null);
    this.#user.set(null);
  }
}

function isCustomer(user: PublicUserProfile): boolean {
  return user.type === 'CLIENTE' || user.type === 'CUSTOMER';
}

function newSessionId(): string {
  return crypto.randomUUID();
}
