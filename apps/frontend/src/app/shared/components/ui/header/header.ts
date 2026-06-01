import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { RolesBack } from '@shared/enums/roles.enum';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-header',
  imports: [RouterLink, NgIf],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  #userLoggedService = inject(UserLoggedService);
  #router = inject(Router);

  userId = this.#userLoggedService.user().user?.id;

  get isCustomer() {
    return this.#userLoggedService.user().user?.type === (RolesBack.CUSTOMER as any);
  }

  get favoritesEnabled() {
    return this.isCustomer && (environment.features?.favoritesMvp ?? false);
  }

  logout() {
    this.#userLoggedService.logout();
  }

  navigateToHome() {
    const type = this.#userLoggedService.user().user?.type;
    if (type) {
      this.#router.navigateByUrl(Utils.getRouteByRoleBack(type as any));
    }
  }
}
