import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { AuthLoginRequest, CustomerAuthSession } from '@taskgo/shared';


@Injectable({
  providedIn: 'root'
})
export class Login {
  readonly #urlBase = environment.url + '/auth/login';
  readonly #http = inject(HttpClient);

  registerUser(data: AuthLoginRequest) {
    return this.#http.post<CustomerAuthSession>(this.#urlBase, data);
  }
}
