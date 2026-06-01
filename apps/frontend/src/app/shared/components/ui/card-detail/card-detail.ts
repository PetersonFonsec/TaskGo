import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-card-detail',
  imports: [],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetail {
  legend = input("");
  image = input("");
  title = input("");
  showFavorite = input(false);
  isFavorite = input(false);
  favoriteLoading = input(false);
  favoriteError = input("");
  favoriteToggle = output();

  onFavoriteClick(event: MouseEvent) {
    event.stopPropagation();
    this.favoriteToggle.emit();
  }
}
