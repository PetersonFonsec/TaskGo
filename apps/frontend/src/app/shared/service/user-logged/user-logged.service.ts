import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { IUser, IUserLogged } from './user-logged.model';
import { TokenService } from '../token/token.service';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserLoggedService {
  #keyLocalStorage = environment.user;
  #tokenService = inject(TokenService);
  #platformId = inject(PLATFORM_ID);
  #router = inject(Router);
  #http = inject(HttpClient);

  // default safe values used during SSR
  storageUser: string = '{}';
  user = signal<IUserLogged>(JSON.parse(this.storageUser));

  constructor() {
    // Only access localStorage when running in the browser
    if (isPlatformBrowser(this.#platformId)) {
      try {
        this.storageUser = localStorage.getItem(this.#keyLocalStorage) ?? '{}';
        const saved = JSON.parse(this.storageUser);
        this.user.set({
          user: { id: saved?.user?.id, type: saved?.user?.type },
          access_token: '',
        } as any);
        localStorage.setItem(
          this.#keyLocalStorage,
          JSON.stringify({ user: { id: saved?.user?.id, type: saved?.user?.type } }),
        );
        if (this.#tokenService.token && saved?.user?.id) {
          this.#http.get<IUser>(environment.url + '/auth/me').subscribe({
            next: (profile) => this.setUserLogged({ user: profile }),
            error: () => this.clearSession(),
          });
        }
      } catch (e) {
        // If parsing or access fails, keep the default empty object
        this.storageUser = '{}';
        this.user.set(JSON.parse(this.storageUser));
      }
    }
  }

  setUserLogged(user: IUserLogged) {
    this.user.set({ user: user.user, providerHome: user.providerHome });
    localStorage.setItem(
      this.#keyLocalStorage,
      JSON.stringify({ user: { id: this.user()?.user?.id, type: this.user()?.user?.type } }),
    );
  }

  updateUser(user: IUser) {
    this.user.update((userLogged) => {
      // userLogged.user = user;
      return userLogged;
    });
    localStorage.setItem(
      this.#keyLocalStorage,
      JSON.stringify({ user: { id: this.user()?.user?.id, type: this.user()?.user?.type } }),
    );
  }

  clearSession() {
    this.user.set(null as any);
    this.#tokenService.clearToken();
    localStorage.removeItem(this.#keyLocalStorage);
  }

  logout() {
    this.clearSession();
    this.#http.post(environment.url + '/auth/logout', {}).subscribe({ error: () => {} });
    this.#tokenService.clearToken();

    localStorage.removeItem(this.#keyLocalStorage);
    this.#router.navigateByUrl('/');
  }
}
