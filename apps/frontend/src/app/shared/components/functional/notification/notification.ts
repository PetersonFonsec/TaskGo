import { Component, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notification',
  imports: [FontAwesomeModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class Notification {
  notificationIcon = input(faBell);
  notificationCount = input(0);
}
