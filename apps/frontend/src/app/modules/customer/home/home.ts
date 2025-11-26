import { RouterLink } from "@angular/router";
import { Component, inject, OnInit, signal } from '@angular/core';

import { UserLoggedService } from "@shared/service/user-logged/user-logged.service";
import { CardThumb } from '@shared/components/ui/card-thumb/card-thumb/card-thumb';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { CategoryService } from "@shared/service/category/category";
import { ICategory } from "@shared/service/category/category.model";
import { Card } from '@shared/components/ui/card/card/card';
import { forkJoin } from "rxjs";
import { User } from "@shared/service/users/user";
import { Order } from "@shared/service/order/order";
import { OrdersResponse } from "@shared/service/order/order.model";

@Component({
  selector: 'app-home',
  imports: [
    CardThumb,
    Card,
    Slider,
    SliderItemDirective,
    ButtonComponent,
    RouterLink
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  #categoryService = inject(CategoryService);
  #userLogged = inject(UserLoggedService);
  #order = inject(Order);

  categories = signal<ICategory[]>([]);
  reviews = signal<any[]>([]);
  orders = signal<OrdersResponse>([]);

  ngOnInit(): void {
    const user = this.#userLogged.user().user;

    forkJoin([
      this.#categoryService.getCategories(),
      this.#order.getOrderByClient(user.id),
    ]).subscribe(([category, orders]) => {
      this.categories.set(category.data);
      this.orders.set(orders);
      // orders.map(({ addressSnap, service }) => ({ addressSnap, service }));
      // this.orders.set(order);
    });
  }
}
