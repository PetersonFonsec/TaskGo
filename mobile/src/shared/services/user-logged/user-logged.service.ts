import { Injectable, inject, signal } from '@angular/core';
import { IUser, IUserLogged } from './user-logged.model';
import { Router } from '@angular/router';
import { TokenService } from '../token/token.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserLoggedService {
  #keyLocalStorage = environment.user;
  #tokenService = inject(TokenService);
  #router = inject(Router);
  storageUser: string = localStorage.getItem(this.#keyLocalStorage) ?? '{}';
  user = signal<IUserLogged>(JSON.parse(this.storageUser));

  seUserLogged(user: IUserLogged) {
    this.user.set(user);
    localStorage.setItem(this.#keyLocalStorage, JSON.stringify(this.user()));
  }

  updatetUser(user: IUser) {
    this.user.update((userLogged) => {
      userLogged.user = user;
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
