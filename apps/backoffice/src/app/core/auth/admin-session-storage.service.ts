import { inject, Injectable } from '@angular/core';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { AdminOperator, AdminSession, AdminTokenPayload } from './admin-session.model';

@Injectable({
  providedIn: 'root'
})
export class AdminSessionStorageService {
  readonly #environment = inject(BACKOFFICE_ENVIRONMENT);

  get tokenStorageKey(): string {
    return this.#environment.adminTokenStorageKey;
  }

  get identityStorageKey(): string {
    return `${this.#environment.adminTokenStorageKey}.identity`;
  }

  restore(): AdminSession | null {
    const token = this.#getItem(this.tokenStorageKey);
    const identity = this.#readOperator();

    if (!token || !identity || !this.isAdministrativeToken(token)) {
      this.clear();
      return null;
    }

    return { token, operator: identity };
  }

  save(session: AdminSession): void {
    if (!this.isAdministrativeToken(session.token) || !session.operator.active) {
      this.clear();
      throw new Error('Backoffice session requires an active administrative token.');
    }

    this.#setItem(this.tokenStorageKey, session.token);
    this.#setItem(this.identityStorageKey, JSON.stringify(session.operator));
  }

  clear(): void {
    this.#removeItem(this.tokenStorageKey);
    this.#removeItem(this.identityStorageKey);
  }

  isAdministrativeToken(token: string): boolean {
    const payload = this.decodeTokenPayload(token);

    return payload?.tokenKind === 'admin';
  }

  decodeTokenPayload(token: string): AdminTokenPayload | null {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(atob(padded)) as AdminTokenPayload;
    } catch {
      return null;
    }
  }

  #readOperator(): AdminOperator | null {
    const value = this.#getItem(this.identityStorageKey);

    if (!value) {
      return null;
    }

    try {
      const operator = JSON.parse(value) as AdminOperator;
      if (
        typeof operator.id !== 'string' ||
        typeof operator.email !== 'string' ||
        typeof operator.name !== 'string' ||
        typeof operator.role !== 'string' ||
        typeof operator.active !== 'boolean'
      ) {
        return null;
      }

      return operator;
    } catch {
      return null;
    }
  }

  #getItem(key: string): string | null {
    return this.#hasLocalStorage() ? localStorage.getItem(key) : null;
  }

  #setItem(key: string, value: string): void {
    if (this.#hasLocalStorage()) {
      localStorage.setItem(key, value);
    }
  }

  #removeItem(key: string): void {
    if (this.#hasLocalStorage()) {
      localStorage.removeItem(key);
    }
  }

  #hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }
}
