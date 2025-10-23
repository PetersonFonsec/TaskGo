import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  #keyLocalStorage = environment.token;

  set token(token: string) {
    localStorage.setItem(this.#keyLocalStorage, token);
  }

  get token(): string {
    return localStorage.getItem(this.#keyLocalStorage) ?? '';
  }

  clearToken() {
    localStorage.removeItem(this.#keyLocalStorage)
  }
}
