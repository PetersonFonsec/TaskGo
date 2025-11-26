import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { InputCheckboxComponent } from '@shared/components/forms/input-checkbox/input-checkbox.component';
import { ButtonBackComponent } from '@shared/components/ui/button-back/button-back.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { ISubCategory } from '@shared/service/category/category.model';
import { CategoryService } from '@shared/service/category/category';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';

@Component({
  selector: 'app-services',
  imports: [ButtonComponent, ButtonBackComponent, InputCheckboxComponent],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services implements OnInit {
  serviceSelected = signal<Set<ISubCategory>>(new Set());
  services = signal<ISubCategory[]>([]);

  #categoryService = inject(CategoryService);
  #registerUser = inject(RegisterUser);
  #activatedRouter = inject(ActivatedRoute);
  #router = inject(Router);

  ngOnInit(): void {
    this.#activatedRouter.paramMap
      .pipe(
        map(params => params.get('categoryId') ?? ''),
        switchMap(id => this.#categoryService.getCategoryById(id)),
      )
      .subscribe({
        next: ({ subcategories }) => {
          this.services.update(() => subcategories);
        }
      });
  }

  addSubCategory(subCategory: ISubCategory) {
    const subCategoryList = new Set(this.serviceSelected());
    subCategoryList.add(subCategory);
    this.serviceSelected.update(() => subCategoryList);
  }

  addServiceSelected() {
    if (!this.serviceSelected()) return;
    this.#registerUser.addService(this.serviceSelected());
    this.#router.navigateByUrl('authenticate/register');
  }
}
