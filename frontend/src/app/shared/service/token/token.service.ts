import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  #keyLocalStorage = environment.token;

  private get hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  set token(token: string) {
    if (this.hasLocalStorage) {
      localStorage.setItem(this.#keyLocalStorage, token);
    }
  }

  get token(): string {
    if (this.hasLocalStorage) {
      return localStorage.getItem(this.#keyLocalStorage) ?? '';
    }
    return '';
  }

  clearToken() {
    if (this.hasLocalStorage) {
      localStorage.removeItem(this.#keyLocalStorage);
    }
  }
}
