import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-price',
  imports: [CurrencyPipe],
  templateUrl: './price.html',
  styleUrl: './price.scss',
})
export class Price {
  value = input(0);
}
