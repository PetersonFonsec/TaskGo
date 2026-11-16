import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { CategoryService } from '@shared/service/category/category';
import { ICategory, ISubCategory } from '@shared/service/category/category.model';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';

/** Categoria dos serviços já escolhidos, para quem volta ao passo. */
function savedCategoryId(services: unknown[]): number | null {
  const first = services[0] as Partial<ISubCategory> | undefined;
  return typeof first?.categoryId === 'number' ? first.categoryId : null;
}

/** Passo 4 do cadastro (profissional): a categoria dos serviços. */
@Component({
  selector: 'app-category',
  imports: [RouterLink, TgAlertComponent, TgButtonComponent, TgCardComponent, TgIconComponent, TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent],
  templateUrl: './category.html',
  styleUrl: './category.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Category {
  #categoryService = inject(CategoryService);
  #registerUser = inject(RegisterUser);
  #router = inject(Router);

  readonly categories = signal<ICategory[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly selectedId = signal<number | null>(savedCategoryId(this.#registerUser.user().services));
  readonly submitted = signal(false);
  readonly retry = new Subject<void>();

  readonly list = viewChild<ElementRef<HTMLElement>>('list');

  constructor() {
    // Só a consulta ativa mexe no estado: o switchMap descarta a anterior, e
    // loading e erro são decididos pela resposta, não por finalize (que
    // rodaria ao cancelar a consulta antiga, depois de a nova começar).
    this.retry
      .pipe(
        startWith(undefined),
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap(() => this.#categoryService.getCategories().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (!response) {
          this.loadError.set(true);
          return;
        }
        this.categories.set(response.data ?? []);
      });
  }

  select(id: number) {
    this.selectedId.set(id);
  }

  selectCategory() {
    this.submitted.set(true);
    const id = this.selectedId();
    if (id === null) {
      this.list()?.nativeElement.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
      return;
    }
    this.#router.navigate(['authenticate', 'category', id, 'service']);
  }
}
