import { Component, inject, input } from '@angular/core';
import { AsideListItem } from '../aside-list-item/aside-list-item';
import { asideListItems, asideListItemsFooter, asideListItemsSecundary } from './aside.constant';
import { ButtonComponent } from '../button/button.component';
import { FaIconComponent, IconDefinition } from "@fortawesome/angular-fontawesome";
import { faArrowRightFromBracket, faCrown } from '@fortawesome/free-solid-svg-icons';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-aside',
  imports: [AsideListItem, ButtonComponent, FaIconComponent],
  templateUrl: './aside.html',
  styleUrl: './aside.scss',
})
export class Aside {
  #userLoggedService = inject(UserLoggedService);

  itemsSecundary = input(asideListItemsSecundary);
  bannerIcon = input<IconDefinition>(faCrown);
  itemsFooter = input(asideListItemsFooter);
  items = input(asideListItems);

  exitItem = {
    text: 'Sair da Conta',
    routerLink: '/customer/logout',
    icon: faArrowRightFromBracket,
    function: (fn: Function) => fn()
  }

  logout() {
    this.#userLoggedService.logout();
  }
}
