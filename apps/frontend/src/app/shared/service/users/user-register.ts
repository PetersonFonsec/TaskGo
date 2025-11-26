import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';

import { loginRequest } from '@modules/auth/services/login/login.model';
import { environment } from '@environments/environment';

import { UserLoggedService } from '../user-logged/user-logged.service';
import { UserRegisterRequest } from './user-register.model';
import { TokenService } from '../token/token.service';

@Injectable({
  providedIn: 'root'
})
export class UserRegister {
  #userService = inject(UserLoggedService);
  #tokenService = inject(TokenService);
  #http = inject(HttpClient);

  login(data: loginRequest) {
    return this.#http.post<any>(environment.url + '/auth/login', data).pipe(
      tap(({ access_token }) => this.#tokenService.token = access_token),
      tap(response => {
        this.#userService.setUserLogged(response);
      })
    );
  }

  registerUser(data: UserRegisterRequest) {
    return this.#http.post<any>(environment.url + '/auth/register', { user: data }).pipe(
      tap(({ access_token }) => this.#tokenService.token = access_token),
      tap(response => {
        this.#userService.setUserLogged(response);
      })
    );
  }
}
