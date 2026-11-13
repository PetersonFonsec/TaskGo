import type { PluginListenerHandle } from '@capacitor/core';
import type { CustomerAuthSession, PublicUserProfile } from '@taskgo/shared';

import {
  PendingRevocation,
  SecureStore,
  StoredSession
} from '@app/core/auth/session-storage';

export const API = 'http://api.test';

export const customer: PublicUserProfile = {
  id: '7',
  name: 'Ana Souza',
  email: 'ana@example.com',
  phone: '11999999999',
  cpf: '00000000000',
  type: 'CLIENTE'
};

export function loginResponse(overrides: Partial<CustomerAuthSession> = {}): CustomerAuthSession {
  return {
    user: customer,
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    ...overrides
  };
}

/**
 * Armazenamento seguro em memória. `hold()` segura a próxima operação até o
 * teste liberar, para simular Keychain/Keystore lentos; `failNext()` faz a
 * próxima operação daquele tipo falhar.
 */
export class MemorySecureStore implements SecureStore {
  readonly data = new Map<string, string>();
  readonly log: string[] = [];
  #held: { op: string; release: Promise<void> }[] = [];
  #failing = new Set<string>();

  hold(op: 'get' | 'set' | 'remove'): () => void {
    let release!: () => void;
    this.#held.push({ op, release: new Promise<void>((resolve) => (release = resolve)) });
    return release;
  }

  failNext(op: 'get' | 'set' | 'remove'): void {
    this.#failing.add(op);
  }

  session(): StoredSession | null {
    const raw = this.data.get('session');
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  pending(): PendingRevocation[] {
    const raw = this.data.get('pending_revocations');
    return raw ? (JSON.parse(raw) as PendingRevocation[]) : [];
  }

  async getItem(key: string): Promise<string | null> {
    await this.#gate('get');
    return this.data.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.#gate('set');
    this.data.set(key, value);
    this.log.push(`set ${key}`);
  }

  async removeItem(key: string): Promise<void> {
    await this.#gate('remove');
    this.data.delete(key);
    this.log.push(`remove ${key}`);
  }

  async #gate(op: string): Promise<void> {
    const index = this.#held.findIndex((entry) => entry.op === op);
    if (index >= 0) {
      const [entry] = this.#held.splice(index, 1);
      await entry.release;
    }
    if (this.#failing.delete(op)) throw new Error(`${op} failed`);
  }
}

/** Deixa todas as promessas pendentes andarem antes do próximo passo do teste. */
export async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await new Promise((resolve) => setTimeout(resolve));
}

/** Evento nativo `resume` controlável: o registro só termina quando o teste quiser. */
export class FakeResumeEvents {
  native = true;
  listeners: (() => void)[] = [];
  removed = 0;
  #pending: (() => void)[] = [];
  holdRegistration = false;

  isNative() {
    return this.native;
  }

  addResumeListener(listener: () => void): Promise<PluginListenerHandle> {
    return new Promise((resolve) => {
      const finish = () => {
        this.listeners.push(listener);
        resolve({
          remove: async () => {
            this.removed++;
            this.listeners = this.listeners.filter((l) => l !== listener);
          }
        });
      };
      if (this.holdRegistration) this.#pending.push(finish);
      else finish();
    });
  }

  finishRegistrations(): void {
    this.#pending.splice(0).forEach((finish) => finish());
  }

  resume(): void {
    [...this.listeners].forEach((listener) => listener());
  }
}
