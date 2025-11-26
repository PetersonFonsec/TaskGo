import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { CardThumb } from '@shared/components/ui/card-thumb/card-thumb/card-thumb';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { ICategory } from '@shared/service/category/category.model';
import { OrdersResponse } from '@shared/service/order/order.model';
import { Card } from '@shared/components/forms/card/card';
import { Order } from '@shared/service/order/order';

@Component({
  selector: 'app-home',
  imports: [
    Card,
    Slider,
    SliderItemDirective,
    RouterLink
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

