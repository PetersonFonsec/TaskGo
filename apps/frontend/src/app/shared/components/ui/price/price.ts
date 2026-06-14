import { Component, input } from '@angular/core';

@Component({
  selector: 'app-price',
  imports: [],
  templateUrl: './price.html',
  styleUrl: './price.scss',
})
export class Price {
  value = input(0);
}
