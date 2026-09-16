import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Address } from '@shared/service/address/address';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { RouterLink } from '@angular/router';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { CardThumb } from '@shared/components/ui/card-thumb/card-thumb/card-thumb';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { CategoryService } from '@shared/service/category/category';
import { ICategory } from '@shared/service/category/category.model';
import { forkJoin } from 'rxjs';
import { Order } from '@shared/service/order/order';
import { OrdersResponse } from '@shared/service/order/order.model';
import { Banner } from '@shared/components/ui/banner/banner';
import { CardAppointment } from '@shared/components/ui/card-appointment/card-appointment';
import { CardServiceHistory } from '@shared/components/ui/card-service-history/card-service-history';

@Component({
  selector: 'app-home',
  imports: [
    FaIconComponent,
    CardThumb,
    CardAppointment,
    CardServiceHistory,
    Slider,
    SliderItemDirective,
    ButtonComponent,
    RouterLink,
    Banner,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  #categoryService = inject(CategoryService);
  #userLogged = inject(UserLoggedService);
  #order = inject(Order);

  #address = inject(Address);
  #destroyRef = inject(DestroyRef);
  readonly addressMissing = signal(false);
  readonly locationIcon = faLocationDot;
  readonly addressLink = ['/general', this.#userLogged.user().user.id, 'addresses'];

  categories = signal<ICategory[]>([]);
  reviews = signal<any[]>([]);
  orders = signal<OrdersResponse>([]);

  ngOnInit(): void {
    const user = this.#userLogged.user().user;

    this.#address
      .getAddress(user.id, 1)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ data }) => this.addressMissing.set(data.length === 0),
        error: () => this.addressMissing.set(false),
      });

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
