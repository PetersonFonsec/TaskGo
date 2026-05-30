import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  selected = input(false);
  color = input('');

  onClick = output<void>();
}
