import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { OrderTimelineEvent } from '@shared/service/order/order.model';

@Component({
  selector: 'app-order-timeline',
  templateUrl: './order-timeline.html',
  styleUrl: './order-timeline.scss',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTimelineComponent {
  events = input.required<OrderTimelineEvent[]>();

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
