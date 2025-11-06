import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-login',
  imports: [InputTextComponent,  ButtonComponent, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

}
