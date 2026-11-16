import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Subject, catchError, combineLatest, finalize, map, of, startWith, switchMap, tap } from 'rxjs';

import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { CategoryService } from '@shared/service/category/category';
import { ISubCategory } from '@shared/service/category/category.model';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';

/** Ids dos serviços já escolhidos, para quem volta ao passo. */
function savedServiceIds(services: unknown[]): Set<number> {
  const ids = services
    .map((service) => (service as Partial<ISubCategory> | null)?.id)
    .filter((id): id is number => typeof id === 'number');
  return new Set(ids);
}

/** Passo 4 do cadastro (profissional): os serviços da categoria escolhida. */
@Component({
  selector: 'app-services',
  imports: [RouterLink, TgAlertComponent, TgButtonComponent, TgCardComponent, TgIconComponent, TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent],
  templateUrl: './services.html',
  styleUrl: '../category/category.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Services {
  #categoryService = inject(CategoryService);
  #registerUser = inject(RegisterUser);
  #liveAnnouncer = inject(LiveAnnouncer);
  #route = inject(ActivatedRoute);
  #router = inject(Router);

  readonly categoryName = signal('');
  readonly services = signal<ISubCategory[]>([]);
  readonly selectedIds = signal<Set<number>>(savedServiceIds(this.#registerUser.user().services));
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly submitted = signal(false);
  readonly retry = new Subject<void>();

  /** Só conta o que é desta categoria (o rascunho pode ter outra). */
  readonly selected = computed(() => this.services().filter((service) => this.selectedIds().has(service.id)));
  readonly countLabel = computed(() => {
    const count = this.selected().length;
    return count === 1 ? '1 selecionado' : `${count} selecionados`;
  });

  readonly list = viewChild<ElementRef<HTMLElement>>('list');

  constructor() {
    combineLatest([this.#route.paramMap.pipe(map((params) => params.get('categoryId') ?? '')), this.retry.pipe(startWith(undefined))])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap(([id]) =>
          this.#categoryService.getCategoryById(id).pipe(
            catchError(() => {
              this.loadError.set(true);
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((category) => {
        this.loading.set(false);
        if (!category) return;
        this.categoryName.set(category.name ?? '');
        this.services.set(category.subcategories ?? []);
      });
  }

  isSelected(service: ISubCategory) {
    return this.selectedIds().has(service.id);
  }

  toggle(service: ISubCategory) {
    const ids = new Set(this.selectedIds());
    if (ids.has(service.id)) ids.delete(service.id);
    else ids.add(service.id);
    this.selectedIds.set(ids);
  }

  addServiceSelected() {
    this.submitted.set(true);
    const selected = this.selected();
    if (!selected.length) {
      this.list()?.nativeElement.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
      return;
    }
    this.#registerUser.addService(selected);
    this.#liveAnnouncer.announce('Serviços adicionados');
    this.#router.navigateByUrl('/authenticate/register');
  }
}
