import { Component, inject, input } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { ButtonComponent } from '../button/button.component';
import { BackButtonDirective } from '@shared/directives/back-button/back-button.directive';

@Component({
  standalone: true,
  selector: 'app-button-back',
  imports: [ButtonComponent, FontAwesomeModule, BackButtonDirective],
  templateUrl: './button-back.component.html',
  styleUrl: './button-back.component.scss'
})
export class ButtonBackComponent {
  readonly id = input("");
  icon = faArrowLeft;
}
