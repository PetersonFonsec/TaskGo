import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

interface Category {
  id: string;
  name: string;
  thumb: string | null;
  isActive: boolean;
}
interface CategoryPage {
  data: Category[];
  meta: { total: number; totalPages: number };
}

@Component({
  selector: 'bo-categories',
  imports: [FormsModule],
  templateUrl: './categories.page.html',
  styleUrl: './categories.page.scss',
})
export class CategoriesPage {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(BACKOFFICE_ENVIRONMENT).apiUrl}/categories`;
  readonly categories = signal<Category[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editing = signal(false);
  readonly deleting = signal<Category | null>(null);
  id: string | null = null;
  name = '';
  thumb = '';
  isActive = true;
  page = 1;
  totalPages = 1;
  total = 0;

  constructor() {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    this.error.set('');
    this.http
      .get<CategoryPage>(this.url, {
        params: { page: this.page, limit: 20, sortBy: 'name', order: 'asc' },
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.categories.set(result.data);
          this.totalPages = result.meta.totalPages;
          this.total = result.meta.total;
        },
        error: (error) => this.fail(error),
      });
  }

  edit(category?: Category): void {
    this.id = category?.id ?? null;
    this.name = category?.name ?? '';
    this.thumb = category?.thumb ?? '';
    this.isActive = category?.isActive ?? true;
    this.editing.set(true);
    this.deleting.set(null);
    this.error.set('');
    this.success.set('');
  }

  uploadThumbnail(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    this.error.set('');
    this.success.set('');
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    ) {
      this.error.set('Selecione uma imagem JPEG, PNG, WebP ou GIF de até 10 MB.');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    this.busy.set(true);
    this.http
      .post<{ thumb: string }>(`${this.url}/images`, body)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.thumb = result.thumb;
          this.success.set('Imagem enviada. Salve a categoria para aplicar a thumbnail.');
        },
        error: (error) => this.fail(error),
      });
  }

  save(): void {
    if (this.busy() || !this.name.trim() || !this.validThumb()) return;
    const body = { name: this.name.trim(), thumb: this.thumb.trim(), isActive: this.isActive };
    this.mutate(
      this.id ? this.http.patch(this.url + '/' + this.id, body) : this.http.post(this.url, body),
      'Categoria salva.',
    );
  }

  toggle(category: Category): void {
    this.mutate(
      this.http.patch(this.url + '/' + category.id, { isActive: !category.isActive }),
      category.isActive ? 'Categoria desabilitada.' : 'Categoria habilitada.',
    );
  }

  remove(): void {
    const category = this.deleting();
    if (category)
      this.mutate(this.http.delete(this.url + '/' + category.id), 'Categoria excluída.');
  }

  validThumb(): boolean {
    return !this.thumb.trim() || /^https?:\/\/[^\s]+$/i.test(this.thumb.trim());
  }

  changePage(delta: number): void {
    this.page += delta;
    this.load();
  }

  private mutate(request: import('rxjs').Observable<unknown>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    request.subscribe({
      next: () => {
        this.editing.set(false);
        this.deleting.set(null);
        this.success.set(message);
        if (message === 'Categoria excluída.' && this.categories().length === 1 && this.page > 1)
          this.page--;
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
