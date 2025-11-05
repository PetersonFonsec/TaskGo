import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-layout-slider-item',
  imports: [ButtonComponent],
  templateUrl: './layout-slider-item.html',
  styleUrl: './layout-slider-item.scss',
})
export class LayoutSliderItem {
  readonly subtitle = input("");
  readonly color = input("");
  readonly title = input("");

  createdAccount = output();
  login = output();

  onCreateAccount() {
    this.createdAccount.emit();
  }

  onLogin() {
    this.login.emit();
  }

}
