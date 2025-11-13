import { inject, Injectable, signal } from '@angular/core';

import { ProviderRegisterRequest } from '@shared/service/users/user-register.model';
import { UserRegister } from '@shared/service/users/user-register';

@Injectable({
  providedIn: 'root'
})
export class RegisterUser {
  user = signal<ProviderRegisterRequest>(null!);
  #userRegister = inject(UserRegister);

  addAddress(address: any) {
    const currentUser = this.user();
    currentUser.provider.address = address;
    this.user.set(currentUser);
  }

  addPersonalInfo(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);
  }

  addCategory(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);
  }

  addSubCategory(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);
  }

  addContact(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);
  }

  register() {
    return this.#userRegister.registerUser(this.user());
  }
}
