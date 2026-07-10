import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import type {
  AuthLoginRequest,
  CustomerAuthSession,
  UserRegistrationRequest,
} from '@taskgo/shared';

import { environment } from '@environments/environment';

import { UserLoggedService } from '../user-logged/user-logged.service';
import { TokenService } from '../token/token.service';

@Injectable({
  providedIn: 'root'
})
export class UserRegister {
  #userService = inject(UserLoggedService);
  #tokenService = inject(TokenService);
  #http = inject(HttpClient);

  login(data: AuthLoginRequest) {
    return this.#http.post<CustomerAuthSession>(environment.url + '/auth/login', data).pipe(
      tap(({ access_token }) => this.#tokenService.token = access_token),
      tap(response => {
        this.#userService.setUserLogged(response as any);
      })
    );
  }

  registerUser(data: UserRegistrationRequest) {
    return this.#http.post<CustomerAuthSession>(environment.url + '/auth/register', { user: data }).pipe(
      tap(({ access_token }) => this.#tokenService.token = access_token),
      tap(response => {
        this.#userService.setUserLogged(response as any);
      })
    );
  }
}
