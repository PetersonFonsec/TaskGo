import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { FontAwesomeModule, IconDefinition } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-aside-list-item',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './aside-list-item.html',
  styleUrl: './aside-list-item.scss',
})
export class AsideListItem {
  icon = input<IconDefinition>()
  routerLink = input('')
  text = input('')
}
