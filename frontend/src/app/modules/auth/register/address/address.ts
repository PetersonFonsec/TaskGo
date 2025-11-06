import { Component } from '@angular/core';
import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';

@Component({
  selector: 'app-address',
  imports: [InputTextComponent, ButtonComponent, ButtonBackComponent],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address {

}
