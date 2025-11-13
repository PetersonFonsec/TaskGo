import { Component, input } from '@angular/core';

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
}
