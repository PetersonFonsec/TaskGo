import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';
import { environment } from '@environments/environment';
import { RolesBack } from '@shared/enums/roles.enum';

import { ProfileHeader } from '../profile-header/profile-header';
import { Notification } from '@shared/components/functional/notification/notification';

@Component({
  selector: 'app-header',
  imports: [ProfileHeader, Notification, FaIconComponent],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  #userLoggedService = inject(UserLoggedService);
  #router = inject(Router);

  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();
  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

  protected readonly menuIcon = faBars;
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

  focusMenuTrigger(): void {
    this.menuTrigger()?.nativeElement.focus();
  }
}
