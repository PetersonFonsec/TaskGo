import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { Roles } from '@shared/enums/roles.enum';

import { LayoutSliderItem } from './components/layout-slider-item/layout-slider-item';
import { LayoutSlider } from './components/layout-slider/layout-slider';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';
@Component({
  selector: 'app-auth-page',
  imports: [LayoutSlider, LayoutSliderItem, RouterModule],
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss']
})
export class AuthPage implements OnInit {
  #currentUser = signal<Roles | null>(null);
  #userStorage = inject(UserStorage);
  #router = inject(Router);
  #theme = inject(Theme);

  disabledaActions = signal(false);
  slider = viewChild<LayoutSlider>(LayoutSlider);
  userType = Roles;

  ngOnInit(): void {
    this.#theme.change.subscribe((role) => {
      const slider = this.slider();
      if (!slider) return;

      const { canScrollLeft, canScrollRight } = slider;

      if (role == Roles.CUSTOMER && canScrollRight()) slider.scrollRight();
      if (role == Roles.PROVIDER && canScrollLeft()) slider.scrollLeft();

      this.#currentUser.set(role);
      this.#userStorage.type.set(role);
    });
  }

  goToCreateAccountForm(userType: Roles) {
    this.#currentUser.set(userType);
    this.#userStorage.type.set(userType);
    this.#router.navigateByUrl('/authenticate/register');
  }

  goToLoging(userType: Roles) {
    this.#currentUser.set(userType);
    this.#userStorage.type.set(userType);
    this.#router.navigateByUrl('/authenticate/login');
  }

  onActivate(event: any) {
    this.disabledaActions.set(true);
  }

  updateTheme(event: any) {
    const { canScrollRight, canScrollLeft } = event;

    if (canScrollLeft && !canScrollRight) {
      this.#theme.setTheme(Roles.CUSTOMER);
      this.#currentUser.set(Roles.CUSTOMER);
      this.#userStorage.type.set(Roles.CUSTOMER);
      return;
    }

    if (!canScrollLeft && canScrollRight) {
      this.#theme.setTheme(Roles.PROVIDER);
      this.#currentUser.set(Roles.PROVIDER);
      this.#userStorage.type.set(Roles.PROVIDER);
      return;
    }
  }
}
