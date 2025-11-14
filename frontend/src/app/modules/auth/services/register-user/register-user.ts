import { inject, Injectable, signal } from '@angular/core';

import { UserRegisterRequest } from '@shared/service/users/user-register.model';
import { UserRegister } from '@shared/service/users/user-register';

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
  user = signal<UserRegisterRequest>({} as any);
  #userRegister = inject(UserRegister);
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
    Object.assign(currentUser, services);
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        service: true
      }
    });
  }

  addContact(personalInfo: any) {
    const currentUser = this.user();
    Object.assign(currentUser, personalInfo);
    this.user.set(currentUser);

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        contact: true
      }
    });
  }

  register() {
    return this.#userRegister.registerUser(this.user());
  }
}
