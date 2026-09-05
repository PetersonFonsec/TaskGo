import { inject, Injectable, signal } from '@angular/core';
import type { UserRegistrationRequest } from '@taskgo/shared';

import {
  UserRegister as UserRegisterDraftState,
  UserRegisterDraft,
} from '@shared/service/users/user-register.model';
import { UserRegister } from '@shared/service/users/user-register';
import { UserStorage } from '@shared/service/users/user-storage';
import { RolesBack } from '@shared/enums/roles.enum';

type RegistrationAddress = UserRegisterDraft['address'];
type RegistrationSocial = UserRegisterDraft['social'];
type PersonalInfo = Pick<UserRegisterDraft, 'name' | 'email' | 'password' | 'phone' | 'cpf'>;

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

  user = signal<UserRegisterDraft>(new UserRegisterDraftState());
  completeSteps = signal(steps);

  addAddress(address: Partial<RegistrationAddress>): void {
    this.user.update((user) => ({
      ...user,
      address: { ...user.address, ...address }
    }));

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        address: true
      }
    });
  }

  addPersonalInfo(personalInfo: PersonalInfo): void {
    this.user.update((user) => ({ ...user, ...personalInfo }));

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        profile: true
      }
    });
  }

  addCategory(personalInfo: Partial<UserRegisterDraft>): void {
    this.user.update((user) => ({ ...user, ...personalInfo }));

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        category: true
      }
    });
  }

  addService(services: Set<unknown> | readonly unknown[]): void {
    this.user.update((user) => ({
      ...user,
      services: Array.isArray(services) ? [...services] : Array.from(services)
    }));

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        service: true
      }
    });
  }

  addSocial(social: Partial<RegistrationSocial>): void {
    this.user.update((user) => ({
      ...user,
      social: { ...user.social, ...social }
    }));

    this.completeSteps.update((steps) => {
      return {
        ...steps,
        contact: true
      }
    });
  }

  register() {
    const user = this.user();
    const payload: UserRegistrationRequest = {
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      cpf: user.cpf,
      type: RolesBack[this.#userStorage.type()],
      address: {
        label: user.address.label,
        street: user.address.street,
        number: user.address.number,
        complement: user.address.complement,
        neighborhood: user.address.neighborhood,
        city: user.address.city,
        state: user.address.state,
        cep: user.address.cep,
        lat: user.address.lat,
        lng: user.address.lng,
      },
      social: {
        whatsapp: user.social.whatsapp,
        instagram: user.social.instagram,
        facebook: user.social.facebook,
        linkdin: user.social.linkdin,
      },
      services: user.services.map((service) => this.toJsonId(service)),
    }
    return this.#userRegister.registerUser(payload);
  }

  private toJsonId(service: unknown): string {
    if (typeof service === 'string' || typeof service === 'number') {
      return service.toString();
    }

    if (service && typeof service === 'object' && 'id' in service) {
      return String(service.id);
    }

    return String(service);
  }
}
