import { Component, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-favorite',
  imports: [FaIconComponent],
  templateUrl: './favorite.html',
  styleUrl: './favorite.scss',
})
export class Favorite {
  favoriteIcon = signal(faHeart);
  favoriteToggle = output();
  isFavorite = input(false);
}
