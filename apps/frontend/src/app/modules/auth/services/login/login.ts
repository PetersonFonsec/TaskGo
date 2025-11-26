import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { loginRequest } from './login.model';


@Injectable({
  providedIn: 'root'
})
export class Login {
  readonly #urlBase = environment.url + '/auth/login';
  readonly #http = inject(HttpClient);

  registerUser(data: loginRequest) {
    return this.#http.post(this.#urlBase, data);
  }
}
