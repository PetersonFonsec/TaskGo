import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-rating',
  templateUrl: './rating.component.html',
  styleUrl: './rating.component.scss',
})
export class RatingComponent {
  value = input(0);
  readonly = input(false);
  valueChange = output<number>();
  hoverValue = signal(0);
  stars = [1, 2, 3, 4, 5];

  active(star: number): boolean { return star <= (this.hoverValue() || this.value()); }
  select(star: number): void { if (!this.readonly()) this.valueChange.emit(star); }
}
