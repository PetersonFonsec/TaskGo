import { RouterLink } from "@angular/router";
import { Component, inject, OnInit, signal } from '@angular/core';

import { CardThumb } from '@shared/components/ui/card-thumb/card-thumb/card-thumb';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { CategoryService } from "@shared/service/category/category";
import { ICategory } from "@shared/service/category/category.model";
import { Card } from '@shared/components/ui/card/card/card';

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
  #categoryService = inject(CategoryService)
  categories = signal<ICategory[]>([]);

  ngOnInit(): void {
    this.#categoryService.getCategories().subscribe(response => {
      this.categories.update(() => response.data);
    });
  }
}
