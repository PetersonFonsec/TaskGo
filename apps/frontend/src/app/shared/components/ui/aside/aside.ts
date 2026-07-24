import { Component, computed, inject } from '@angular/core';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

import { AsideListItem } from '../aside-list-item/aside-list-item';
import { NavigationAction, resolveNavigationGroups } from './aside.constant';

@Component({
  selector: 'app-aside',
  imports: [AsideListItem],
  templateUrl: './aside.html',
  styleUrl: './aside.scss',
})
export class Aside {
  readonly #userLoggedService = inject(UserLoggedService);

  protected readonly groups = computed(() => {
    const user = this.#userLoggedService.user()?.user;
    return resolveNavigationGroups(user?.type, user?.id);
  });

  protected handleAction(action: NavigationAction): void {
    if (action === 'logout') {
      this.#userLoggedService.logout();
    }
  }
}
