import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Paginable } from '@shared/interfaces/paginable.interface';
import { environment } from '@environments/environment.development';
import { ICategory, ICategoryWithSubCategories } from './category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  readonly #urlBase = environment.url + '/categories';
  readonly #http = inject(HttpClient);

  getCategories() {
    return this.#http.get<Paginable<ICategory>>(this.#urlBase);
  }

  getCategoryById(id: string) {
    return this.#http.get<ICategoryWithSubCategories>(`${this.#urlBase}/${id}`);
  }
}
