import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { IUser, IUserLogged } from './user-logged.model';
import { TokenService } from '../token/token.service';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserLoggedService {
  #keyLocalStorage = environment.user;
  #tokenService = inject(TokenService);
  #router = inject(Router);
  #platformId = inject(PLATFORM_ID);

  // default safe values used during SSR
  storageUser: string = '{}';
  user = signal<IUserLogged>(JSON.parse(this.storageUser));

  constructor() {
    // Only access localStorage when running in the browser
    if (isPlatformBrowser(this.#platformId)) {
      try {
        this.storageUser = localStorage.getItem(this.#keyLocalStorage) ?? '{}';
        this.user.set(JSON.parse(this.storageUser));
      } catch (e) {
        // If parsing or access fails, keep the default empty object
        this.storageUser = '{}';
        this.user.set(JSON.parse(this.storageUser));
      }
    }
  }

  setUserLogged(user: IUserLogged) {
    this.user.set(user);
    localStorage.setItem(this.#keyLocalStorage, JSON.stringify(this.user()));
  }

  updateUser(user: IUser) {
    this.user.update((userLogged) => {
      // userLogged.user = user;
      return userLogged
    });
    localStorage.setItem(this.#keyLocalStorage, JSON.stringify(this.user()));
  }

  logout() {
    this.user.update(() => null as any);
    this.#tokenService.clearToken();

    localStorage.removeItem(this.#keyLocalStorage);
    this.#router.navigateByUrl("/");
  }
}
