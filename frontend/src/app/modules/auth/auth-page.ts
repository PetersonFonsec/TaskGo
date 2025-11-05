import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

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
  userType = signal(Roles.CUSTOMER);

  goToCreateAccountForm() {
    alert('teste');
  }

  goToLoging() {
    alert('teste');
  }
}
