import { Component } from '@angular/core';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-login',
  imports: [InputTextComponent,  ButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

}
