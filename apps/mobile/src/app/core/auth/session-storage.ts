import { inject, Injectable, InjectionToken } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { PublicUserProfile } from '@taskgo/shared';

/** Sessão ativa. `id` é local ao aparelho e não muda nas renovações. */
export interface StoredSession {
  readonly id: string;
  readonly refreshToken: string;
  readonly user: PublicUserProfile;
}

/** Sessão encerrada no app cuja revogação na API ainda não foi confirmada. */
export interface PendingRevocation {
  readonly id: string;
  readonly refreshToken: string;
}

/** Operações mínimas do armazenamento seguro, trocáveis nos testes. */
export interface SecureStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Keychain (iOS) ou Keystore (Android). No navegador o plugin cai para o
 * localStorage, o que só serve para desenvolvimento.
 */
export const SECURE_STORE = new InjectionToken<SecureStore>('SECURE_STORE', {
  providedIn: 'root',
  factory: () => {
    let prefixReady: Promise<void> | null = null;
    const ready = () => (prefixReady ??= SecureStorage.setKeyPrefix('taskgo_'));
    return {
      getItem: async (key) => (await ready(), SecureStorage.getItem(key)),
      setItem: async (key, value) => (await ready(), SecureStorage.setItem(key, value)),
      removeItem: async (key) => (await ready(), SecureStorage.removeItem(key))
    };
  }
});

const SESSION_KEY = 'session';
const PENDING_KEY = 'pending_revocations';

/**
 * Guarda a sessão e as revogações pendentes. Todas as operações passam por uma
 * fila: cada uma começa só depois que a anterior terminou, então o que fica
 * gravado segue a ordem em que o app pediu, nunca a ordem em que o armazenamento
 * respondeu. O access token nunca é gravado.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorage {
  readonly #store = inject(SECURE_STORE);
  #queue: Promise<unknown> = Promise.resolve();

  /** A sessão salva, salvo se ela já foi encerrada (revogação pendente). */
  load(): Promise<StoredSession | null> {
    return this.#run(async () => {
      const session = await this.#readSession();
      if (!session) return null;
      const pending = await this.#readPending();
      return pending.some((entry) => entry.id === session.id) ? null : session;
    });
  }

  save(session: StoredSession): Promise<void> {
    return this.#run(() => this.#store.setItem(SESSION_KEY, JSON.stringify(session)));
  }

  /** Apaga a sessão salva se ela ainda for `id`; nunca apaga a de outro login. */
  removeSession(id: string): Promise<void> {
    return this.#run(() => this.#removeSessionIfOwned(id));
  }

  /**
   * Encerra a sessão no aparelho: registra a revogação pendente e apaga a
   * sessão salva. Devolve se a sessão salva foi de fato apagada.
   */
  endSession(pending: PendingRevocation): Promise<boolean> {
    return this.#run(async () => {
      try {
        const list = await this.#readPending();
        if (!list.some((entry) => entry.id === pending.id)) {
          await this.#writePending([...list, pending]);
        }
      } catch {
        // Sem a pendência gravada, a revogação ainda é tentada agora pela rede.
      }
      try {
        await this.#removeSessionIfOwned(pending.id);
        return true;
      } catch {
        return false;
      }
    });
  }

  pendingRevocations(): Promise<readonly PendingRevocation[]> {
    return this.#run(() => this.#readPending());
  }

  /** Remove só a pendência `id`; as de outras sessões continuam. */
  removePending(id: string): Promise<void> {
    return this.#run(async () => {
      const list = await this.#readPending();
      await this.#writePending(list.filter((entry) => entry.id !== id));
    });
  }

  #run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #readSession(): Promise<StoredSession | null> {
    const parsed = parse(await this.#store.getItem(SESSION_KEY));
    return isRecord(parsed) &&
      typeof parsed['id'] === 'string' &&
      typeof parsed['refreshToken'] === 'string' &&
      isRecord(parsed['user'])
      ? (parsed as unknown as StoredSession)
      : null;
  }

  async #removeSessionIfOwned(id: string): Promise<void> {
    const raw = await this.#store.getItem(SESSION_KEY);
    if (raw === null) return;
    const current = await this.#readSession();
    // Registro ilegível também sai: não pode ser restaurado com segurança.
    if (!current || current.id === id) await this.#store.removeItem(SESSION_KEY);
  }

  async #readPending(): Promise<PendingRevocation[]> {
    const parsed = parse(await this.#store.getItem(PENDING_KEY));
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is PendingRevocation =>
            isRecord(entry) &&
            typeof entry['id'] === 'string' &&
            typeof entry['refreshToken'] === 'string'
        )
      : [];
  }

  #writePending(list: readonly PendingRevocation[]): Promise<void> {
    return list.length
      ? this.#store.setItem(PENDING_KEY, JSON.stringify(list))
      : this.#store.removeItem(PENDING_KEY);
  }
}

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
