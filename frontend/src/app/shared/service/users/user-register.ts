import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { UserRegisterRequest } from './user-register.model';

@Injectable({
  providedIn: 'root'
})
export class UserRegister {
  readonly #urlBase = environment.url + '/auth/register-provider';
  readonly #http = inject(HttpClient);

  registerUser(data: UserRegisterRequest) {
    return this.#http.post(this.#urlBase, data);
  }
}
