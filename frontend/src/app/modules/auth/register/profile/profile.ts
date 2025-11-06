import { Component } from '@angular/core';
import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';


@Component({
  selector: 'app-profile',
  imports: [InputTextComponent, ButtonComponent, ButtonBackComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {

}
