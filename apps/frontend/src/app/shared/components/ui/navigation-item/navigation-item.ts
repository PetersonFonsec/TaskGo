import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { NavigationAction, ResolvedNavigationItem } from '../header/navigation.constant';

@Component({
  selector: 'app-navigation-item',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './navigation-item.html',
  styleUrl: './navigation-item.scss',
})
export class NavigationItem {
  readonly item = input<ResolvedNavigationItem | null>(null);
  readonly actionSelected = output<NavigationAction>();
}
