import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { LayoutSliderItem } from './components/layout-slider-item/layout-slider-item';
import { LayoutSlider } from './components/layout-slider/layout-slider';
import { Roles } from '@shared/enums/roles.enum';
@Component({
  selector: 'app-auth-page',
  imports: [LayoutSlider, LayoutSliderItem, RouterModule],
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss']
})
export class AuthPage {
  #router = inject(Router);
  #currentUser = signal<Roles | null>(null);
  disabledaActions = signal(false);
  userType = Roles;

  goToCreateAccountForm(userType: Roles) {
    this.#currentUser.set(userType);
    this.#router.navigateByUrl('/authenticate/register');
  }

  goToLoging(userType: Roles) {
    this.#currentUser.set(userType);
    this.#router.navigateByUrl('/authenticate/login');
  }

  onActivate(event: any) {
    this.disabledaActions.set(true);
  }
}
