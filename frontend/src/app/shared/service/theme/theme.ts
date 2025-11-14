import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Roles } from '@shared/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  #platformId = inject(PLATFORM_ID);

  setTheme(role: Roles = Roles.CUSTOMER) {
    if (!isPlatformBrowser(this.#platformId)) return;
    document.documentElement.setAttribute('data-theme', role);
  }
}
