import { Component, computed, contentChildren, Directive, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Step } from '../step/step';

@Directive({
  standalone: true,
  selector: '[stepDirective]',
})
export class StepDirective { }

@Component({
  selector: 'app-steps-lines',
  imports: [CommonModule],
  templateUrl: './steps-lines.html',
  styleUrl: './steps-lines.scss',
})
export class StepsLines {
  steps = contentChildren(Step, { read: Step });
  stepClicked = output<Step>();
  title = input("Passos");
  allStepsCompletes = computed(() => {
    for (let step of this.steps()) {
      if (!step.complete()) return false;
    }

    return true;
  });

  completeSteps = computed(() => {
    const completeStep = [];
    for (let step of this.steps()) {
      if (step.complete()) completeStep.push(step);
    }
    return completeStep;
  });
}
