import { Component, input, output, signal } from '@angular/core';
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCheck, faHeart, faMapMarkerAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '../button/button.component';
import { Price } from '../price/price';
import { Badge } from "../badge/badge";

@Component({
  selector: 'app-card-detail',
  imports: [FaIconComponent, ButtonComponent, Price, Badge],
  templateUrl: './card-detail.html',
  styleUrl: './card-detail.scss',
})
export class CardDetail {
  mapIcon = signal(faMapMarkerAlt);
  favoriteIcon = signal(faHeart);
  checkIcon = signal(faCheck);
  timeIcon = signal(faTimes);
  
  isFavorite = input(false);
  legend = input("");
  image = input("");
  title = input("");
  
  favoriteToggle = output();
  
  onFavoriteClick() {
    this.favoriteToggle.emit();
  }
}
