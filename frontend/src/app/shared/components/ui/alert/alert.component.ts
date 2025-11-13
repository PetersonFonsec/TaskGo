import { NgClass } from '@angular/common';
import { Component, Input, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faInfoCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export enum AlertTypes {
  error = "error",
  warning = "warning",
  success = "success",
  info = "info"
}

@Component({
  selector: 'alert',
  standalone: true,
  imports: [FontAwesomeModule, NgClass],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss'
})
export class AlertComponent {
  @Input() type: AlertTypes = AlertTypes.error;
  readonly hideShadow = input(false);

  get icon() {
    return this.type != AlertTypes.success ? faInfoCircle : faCheckCircle
  };
}
