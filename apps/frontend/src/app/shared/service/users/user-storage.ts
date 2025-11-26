import { Injectable, signal } from '@angular/core';
import { UserRegister } from './user-register.model';
import { Roles } from '@shared/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class UserStorage {
  user = signal<UserRegister>(new UserRegister());
  type = signal<Roles>(Roles.CUSTOMER);
}
