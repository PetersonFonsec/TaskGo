import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-badge-icon',
  imports: [FaIconComponent],
  templateUrl: './badge-icon.html',
  styleUrl: './badge-icon.scss',
})
export class BadgeIcon {
  color = input<string>("primary");
  icon = input<IconDefinition>();
}
