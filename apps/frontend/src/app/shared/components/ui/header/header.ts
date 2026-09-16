import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Utils } from '@shared/service/utils/utils.service';
import { ProfileHeader } from '../profile-header/profile-header';
import { Notification } from '@shared/components/functional/notification/notification';
import { NavigationItem } from '../navigation-item/navigation-item';
import { NavigationAction, resolveNavigationGroups } from './navigation.constant';

@Component({
  selector: 'app-header',
  imports: [ProfileHeader, Notification, NavigationItem],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly #userLoggedService = inject(UserLoggedService);
  readonly #router = inject(Router);

  protected readonly groups = computed(() => {
    const user = this.#userLoggedService.user()?.user;
    return resolveNavigationGroups(user?.type, user?.id);
  });

  protected handleAction(action: NavigationAction): void {
    if (action === 'logout') this.#userLoggedService.logout();
  }

  navigateToHome(): void {
    const type = this.#userLoggedService.user().user?.type;
    if (type) this.#router.navigateByUrl(Utils.getRouteByRoleBack(type as any));
  }
}
