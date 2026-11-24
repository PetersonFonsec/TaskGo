import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

export interface CategoryService {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
interface CategoryServicesResponse {
  category: { id: string; name: string; isActive: boolean };
  data: CategoryService[];
}

/**
 * Serviços que uma categoria oferece. É a lista que o prestador vê no passo
 * "Serviços" do cadastro, depois de escolher a categoria.
 */
@Component({
  selector: 'bo-category-services',
  imports: [FormsModule, RouterLink],
  templateUrl: './category-services.page.html',
  styleUrl: './categories.page.scss',
})
export class CategoryServicesPage {
  private readonly http = inject(HttpClient);
  private readonly categoryId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly url = `${inject(BACKOFFICE_ENVIRONMENT).apiUrl}/categories/${this.categoryId}/services`;
  readonly categoryName = signal('');
  readonly categoryActive = signal(true);
  readonly services = signal<CategoryService[]>([]);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editing = signal(false);
  readonly deleting = signal<CategoryService | null>(null);
  id: string | null = null;
  name = '';
  description = '';
  sortOrder = 0;
  isActive = true;

  constructor() {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.error.set('');
    this.http
      .get<CategoryServicesResponse>(this.url)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.categoryName.set(result.category.name);
          this.categoryActive.set(result.category.isActive);
          this.services.set(result.data);
          this.loaded.set(true);
        },
        error: (error) => this.fail(error),
      });
  }

  edit(service?: CategoryService): void {
    this.id = service?.id ?? null;
    this.name = service?.name ?? '';
    this.description = service?.description ?? '';
    this.sortOrder = service?.sortOrder ?? this.nextSortOrder();
    this.isActive = service?.isActive ?? true;
    this.editing.set(true);
    this.deleting.set(null);
    this.error.set('');
    this.success.set('');
  }

  validSortOrder(): boolean {
    return Number.isInteger(this.sortOrder) && this.sortOrder >= 0 && this.sortOrder <= 9999;
  }

  save(): void {
    if (this.busy() || !this.name.trim() || !this.validSortOrder()) return;
    const body = {
      name: this.name.trim(),
      description: this.description.trim(),
      sortOrder: this.sortOrder,
      isActive: this.isActive,
    };
    this.mutate(
      this.id ? this.http.patch(`${this.url}/${this.id}`, body) : this.http.post(this.url, body),
      'Serviço salvo.',
    );
  }

  toggle(service: CategoryService): void {
    this.mutate(
      this.http.patch(`${this.url}/${service.id}`, { isActive: !service.isActive }),
      service.isActive ? 'Serviço desabilitado.' : 'Serviço habilitado.',
    );
  }

  remove(): void {
    const service = this.deleting();
    if (service) this.mutate(this.http.delete(`${this.url}/${service.id}`), 'Serviço excluído.');
  }

  private nextSortOrder(): number {
    const orders = this.services().map((service) => service.sortOrder);
    return orders.length ? Math.min(Math.max(...orders) + 1, 9999) : 0;
  }

  private mutate(request: Observable<unknown>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    request.subscribe({
      next: () => {
        this.editing.set(false);
        this.deleting.set(null);
        this.success.set(message);
        this.load();
      },
      error: (error) => {
        this.busy.set(false);
        this.fail(error);
      },
    });
  }

  private fail(error: HttpErrorResponse): void {
    const message = error.error?.message;
    this.error.set(
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? message.join(' ')
          : 'Não foi possível concluir a operação. Tente novamente.',
    );
  }
}
