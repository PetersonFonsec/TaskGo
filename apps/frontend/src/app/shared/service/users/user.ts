import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { UserResponse } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class User {
  #http = inject(HttpClient);
  #urlbase = environment.url;

  getUser(userId: string) {
    return this.#http.get<UserResponse>(this.#urlbase + `/user/${userId}`);
  }

  getProvider(userId: string) {
    return this.#http.get<UserResponse>(this.#urlbase + `/provider/${userId}`);
  }
}
