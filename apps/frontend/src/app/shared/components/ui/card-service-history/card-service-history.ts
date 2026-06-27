import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck,
  faLocationDot,
  faRotateRight,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-card-service-history',
  imports: [FaIconComponent],
  templateUrl: './card-service-history.html',
  styleUrl: './card-service-history.scss',
})
export class CardServiceHistory {
  title = input.required<string>();
  address = input.required<string>();
  date = input.required<string>();
  provider = input.required<string>();

  calendarIcon = faCalendarCheck;
  locationIcon = faLocationDot;
  repeatIcon = faRotateRight;
  userIcon = faUser;
}
