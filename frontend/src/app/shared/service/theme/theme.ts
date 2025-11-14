import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Roles } from '@shared/enums/roles.enum';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  #platformId = inject(PLATFORM_ID);
  change = new BehaviorSubject(Roles.PROVIDER);

  setTheme(role: Roles = Roles.PROVIDER) {
    if (!isPlatformBrowser(this.#platformId)) return;
    document.documentElement.setAttribute('data-theme', role);
    this.change.next(role);
  }
}
