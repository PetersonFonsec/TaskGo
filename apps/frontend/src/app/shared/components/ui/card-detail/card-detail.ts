import { Component, input, output, signal } from '@angular/core';
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { Badge } from "../badge/badge";

@Component({
  selector: 'app-card-detail',
  imports: [FaIconComponent, Badge],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetail {
  checkIcon = signal(faCheck);
  
  verified = input(false);
  image = input("");
  
  clickButton = output();
}
