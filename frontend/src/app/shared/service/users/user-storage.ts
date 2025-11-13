import { Injectable, signal } from '@angular/core';
import { CustomerRegister, CustomerRegisterRequest, ProviderRegister, ProviderRegisterRequest } from './user-register.model';
import { Roles } from '@shared/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class UserStorage {
  provider = signal<ProviderRegisterRequest>(new ProviderRegister());
  customer = signal<CustomerRegisterRequest>(new CustomerRegister());
  type = signal<Roles>(Roles.CUSTOMER);
}
