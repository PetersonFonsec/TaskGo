import { Component, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-card',
  imports: [FontAwesomeModule],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  icon = faChevronRight;
  title = input();
}
