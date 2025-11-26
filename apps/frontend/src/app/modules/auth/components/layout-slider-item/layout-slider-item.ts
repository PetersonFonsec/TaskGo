import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Roles } from '@shared/enums/roles.enum';

@Component({
  selector: 'app-layout-slider-item',
  imports: [ButtonComponent],
  templateUrl: './layout-slider-item.html',
  styleUrl: './layout-slider-item.scss',
})
export class LayoutSliderItem {
  readonly userType = input(Roles.CUSTOMER);
  readonly subtitle = input("");
  readonly title = input("");
  readonly disabled = input(false);

  createdAccount = output<Roles>();
  login = output<Roles>();

  onCreateAccount() {
    this.createdAccount.emit(this.userType());
  }

  onLogin() {
    this.login.emit(this.userType());
  }

}
