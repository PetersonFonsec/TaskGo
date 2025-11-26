import { inject, Injectable, signal } from '@angular/core';

import { UserRegisterRequest, UserRegister as User } from '@shared/service/users/user-register.model';
import { UserRegister } from '@shared/service/users/user-register';
import { UserStorage } from '@shared/service/users/user-storage';
import { RolesBack } from '@shared/enums/roles.enum';

const steps = {
  profile: false,
  contact: false,
  address: false,
  category: false,
  service: false
}
@Injectable({
  providedIn: 'root'
})
export class RegisterUser {
  #userRegister = inject(UserRegister);
  #userStorage = inject(UserStorage);

  user = signal<UserRegisterRequest>(new User());
  completeSteps = signal(steps);

  addAddress(address: any) {
    const currentUser = this.user();
    currentUser.address = address;
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        address: true
      }
    });
  }

  addPersonalInfo(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        profile: true
      }
    });
  }

  addCategory(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        category: true
      }
    });
  }

  addService(services: any) {
    const currentUser = this.user();
    currentUser.services = services;
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        service: true
      }
    });
  }

  addSocial(social: any) {
    const currentUser = this.user();
    Object.assign(currentUser.social, social);
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        contact: true
      }
    });
  }

  register() {
    const payload = {
      ...this.user(),
      type: RolesBack[this.#userStorage.type()]
    }
    return this.#userRegister.registerUser(payload);
  }
}
