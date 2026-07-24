import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import {
  NavigationAction,
  ResolvedNavigationItem,
} from '../aside/aside.constant';

@Component({
  selector: 'app-aside-list-item',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './aside-list-item.html',
  styleUrl: './aside-list-item.scss',
})
export class AsideListItem {
  readonly item = input<ResolvedNavigationItem | null>(null);
  readonly actionSelected = output<NavigationAction>();
}
