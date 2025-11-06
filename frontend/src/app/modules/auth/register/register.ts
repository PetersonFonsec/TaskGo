import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from "@angular/router";

import { StepDirective, StepsLines } from '@shared/components/forms/steps-lines/steps-lines';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { Step } from '@shared/components/forms/step/step';

@Component({
  selector: 'app-register',
  imports: [ButtonComponent, StepsLines, Step, RouterLink, FullModal],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  showModal = signal(false);
  #router = inject(Router);

  goToHome() {
    this.#router.navigateByUrl('/customer');
  }
}
