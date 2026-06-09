import { Component } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-banner',
  imports: [ButtonComponent],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
})
export class Banner {

}
