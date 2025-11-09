import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card-thumb',
  imports: [],
  templateUrl: './card-thumb.html',
  styleUrl: './card-thumb.scss',
})
export class CardThumb {
 title = input();
 image = input();
}
