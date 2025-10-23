import { Component, input } from '@angular/core';

export enum ButtonColors {
  "primary" = "primary",
  "secundary" = "secundary"
}
export enum ButtonSize {
  "small" = "small",
  "medium" = "medium"
}

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  readonly color = input("primary");
  readonly size = input("medium");
  readonly id = input("", { transform: (value: string /*T:VAE*/) => `${value}-button` });
  readonly disabled = input(false);
  readonly type = input("button");
}
