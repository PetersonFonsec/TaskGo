import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import type { PublicUserProfile, UserProfileUpdateRequest } from '@taskgo/shared';
import type { ProviderProfileResponse } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class User {
  #http = inject(HttpClient);
  #urlbase = environment.url;

  getUser(userId: string) {
    return this.#http.get<PublicUserProfile>(this.#urlbase + `/user/${userId}`);
  }

  getProvider(userId: string) {
    return this.#http.get<ProviderProfileResponse>(this.#urlbase + `/provider/${userId}`);
  }

  updateUser(userId: string, payload: UserProfileUpdateRequest) {
    return this.#http.patch<PublicUserProfile>(this.#urlbase + `/user/${userId}`, payload);
  }
}
