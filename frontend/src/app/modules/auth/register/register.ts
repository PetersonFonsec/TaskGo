import { Component } from '@angular/core';

import { StepDirective, StepsLines } from '@shared/components/forms/steps-lines/steps-lines';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { Step } from '@shared/components/forms/step/step';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-register',
  imports: [ButtonComponent, StepsLines, Step, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {

  onStepClicked(step: StepDirective) {
    console.log(step);
  }
}
