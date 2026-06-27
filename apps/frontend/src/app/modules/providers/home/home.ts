import { Component, inject, OnInit, signal } from '@angular/core';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { forkJoin } from 'rxjs';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ICategory } from '@shared/service/category/category.model';
import { OrdersResponse } from '@shared/service/order/order.model';
import { Order } from '@shared/service/order/order';
import { ProviderRevenueChart } from '@shared/components/functional/provider-revenue-chart/provider-revenue-chart';

@Component({
  selector: 'app-home',
  imports: [ProviderRevenueChart
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  #userLogged = inject(UserLoggedService);
  #order = inject(Order);

  categories = signal<ICategory[]>([]);
  orders = signal<OrdersResponse>([]);
  reviews = signal<any[]>([]);

  ngOnInit(): void {
    const user = this.#userLogged.user().user;

    forkJoin([
      this.#order.getOrderByProvider(user.id),
    ]).subscribe(([orders]) => {
      this.orders.set(orders);
    });
  }
}
