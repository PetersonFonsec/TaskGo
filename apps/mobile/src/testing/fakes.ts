import { Injectable } from '@angular/core';
import type { CustomerAuthSession, PublicUserProfile } from '@taskgo/shared';

import { SessionStorage, StoredSession } from '@app/core/auth/session-storage';

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

/** Guarda a sessão em memória no lugar do Keychain/Keystore. */
@Injectable()
export class MemorySessionStorage extends SessionStorage {
  stored: StoredSession | null = null;
  saves: StoredSession[] = [];

  override async load(): Promise<StoredSession | null> {
    return this.stored;
  }

  override async save(session: StoredSession): Promise<void> {
    this.stored = session;
    this.saves.push(session);
  }

  override async clear(): Promise<void> {
    this.stored = null;
  }
}

/** Deixa as promessas pendentes andarem (o HttpClient de teste responde sincronamente). */
export async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}
