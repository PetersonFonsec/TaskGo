import { Component, input } from '@angular/core';

import { OrderTimelineEvent } from '@shared/service/order/order.model';

@Component({
  selector: 'app-order-timeline',
  templateUrl: './order-timeline.html',
  styleUrl: './order-timeline.scss',
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
