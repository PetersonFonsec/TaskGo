
import {
  trigger,
  style,
  animate,
  query,
  transition,
  group,
  stagger,
} from '@angular/animations';
const optional = { optional: true };

export const fadeAnimation = trigger('fade', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0 }),
      stagger(30, [
        animate('300ms ease-in', style({ opacity: 1 })),
      ])
    ], optional),
  ])
]);

