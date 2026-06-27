import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Roles, RolesBack } from '@shared/enums/roles.enum';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  #platformId = inject(PLATFORM_ID);
  change = new BehaviorSubject(Roles.CUSTOMER);

  setTheme(role: Roles | RolesBack | string = Roles.CUSTOMER) {
    const normalizedRole = this.normalizeRole(role);

    if (!isPlatformBrowser(this.#platformId)) return;
    document.documentElement.setAttribute('data-theme', normalizedRole);
    this.change.next(normalizedRole);
  }

  private normalizeRole(role: Roles | RolesBack | string): Roles {
    return role === Roles.PROVIDER || role === RolesBack.PROVIDER
      ? Roles.PROVIDER
      : Roles.CUSTOMER;
  }
}
