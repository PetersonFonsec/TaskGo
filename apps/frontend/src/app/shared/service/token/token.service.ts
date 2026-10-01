import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
export const COOKIE_SESSION = 'cookie-session';
@Injectable({ providedIn: 'root' })
export class TokenService {
  // This marker grants no authority. The HttpOnly cookie is verified by the API.
  #key = environment.token;
  get token(): string {
    if (typeof window === 'undefined') return '';
    const value = localStorage.getItem(this.#key);
    if (value && value !== COOKIE_SESSION) localStorage.removeItem(this.#key);
    return value === COOKIE_SESSION ? COOKIE_SESSION : '';
  }
  set token(value: string) {
    if (typeof window !== 'undefined')
      value ? localStorage.setItem(this.#key, COOKIE_SESSION) : localStorage.removeItem(this.#key);
  }
  clearToken() {
    this.token = '';
  }
}
