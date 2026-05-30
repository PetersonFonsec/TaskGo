import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { CategoryService } from '@shared/service/category/category';
import { ICategory } from '@shared/service/category/category.model';
import { Card } from '@shared/components/forms/card/card';

@Component({
  selector: 'app-category',
  imports: [ButtonComponent, ButtonBackComponent, Card],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class Category implements OnInit {
  categorySelected = signal<ICategory>(null!);
  categories = signal<ICategory[]>([]);

  #categoryService = inject(CategoryService);
  #router = inject(Router);

  ngOnInit() {
    this.#categoryService.getCategories().subscribe(response => {
      this.categories.update(() => response.data);
    });
  }

  selectCategory() {
    if(!this.categorySelected()) return;
    this.#router.navigate(['authenticate','category', this.categorySelected().id, 'service']);
  }
}
