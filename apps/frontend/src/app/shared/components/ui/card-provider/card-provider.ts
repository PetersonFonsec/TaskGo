import { Component, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { CardProviderParams } from './card-provider.interface';
import { Favorite } from '../../functional/favorite/favorite';
import { PROVIDER_CONTENT } from './card-provider.constants';
import { ButtonComponent } from '../button/button.component';
import { CardDetail } from '../card-detail/card-detail';
import { Price } from '../price/price';

@Component({
  selector: 'app-card-provider',
  imports: [
    CardDetail, 
    Favorite, 
    FaIconComponent, 
    Price, 
    ButtonComponent
  ],
  templateUrl: './card-provider.html',
  styleUrl: './card-provider.scss',
})
export class CardProvider {
  subtitles = signal(PROVIDER_CONTENT);
  
  params = input<CardProviderParams>();

  favoriteToggle = output();
  clickButton = output();
}
