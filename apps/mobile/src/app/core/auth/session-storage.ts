import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { PublicUserProfile } from '@taskgo/shared';

export interface StoredSession {
  readonly refreshToken: string;
  readonly user: PublicUserProfile;
}

const SESSION_KEY = 'session';

/**
 * Guarda a sessão no Keychain (iOS) ou Keystore (Android). No navegador, o
 * plugin cai para o localStorage, o que só serve para desenvolvimento.
 * O access token nunca é gravado: vive só em memória.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorage {
  #prefixReady: Promise<void> | null = null;

  async load(): Promise<StoredSession | null> {
    await this.#prefix();
    const raw = await SecureStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      return typeof parsed.refreshToken === 'string' && parsed.user ? (parsed as StoredSession) : null;
    } catch {
      return null;
    }
  }

  async save(session: StoredSession): Promise<void> {
    await this.#prefix();
    await SecureStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async clear(): Promise<void> {
    await this.#prefix();
    await SecureStorage.removeItem(SESSION_KEY);
  }

  #prefix(): Promise<void> {
    this.#prefixReady ??= SecureStorage.setKeyPrefix('taskgo_');
    return this.#prefixReady;
  }
}
