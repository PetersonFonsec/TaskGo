import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';
import { CategoriesPage } from './categories.page';

describe('CategoriesPage', () => {
  let page: CategoriesPage;
  let http: HttpTestingController;
  const category = { id: '1', name: 'Limpeza', thumb: null, isActive: false };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: { apiUrl: '/admin' } },
      ],
    });
    page = TestBed.createComponent(CategoriesPage).componentInstance;
    http = TestBed.inject(HttpTestingController);
    reload();
  });
  afterEach(() => http.verify());
  function reload() {
    http
      .expectOne((request) => request.method === 'GET' && request.url === '/admin/categories')
      .flush({ data: [category], meta: { total: 1, totalPages: 1 } });
  }
  it('uploads the thumbnail and includes the delivery URL when saving', () => {
    page.edit(category);
    const file = new File(['image'], 'thumb.png', { type: 'image/png' });
    page.uploadThumbnail({ target: { files: [file], value: 'thumb.png' } } as unknown as Event);
    const upload = http.expectOne('/admin/categories/images');
    expect(upload.request.body.get('file')).toEqual(file);
    expect(page.busy()).toBeTrue();
    upload.flush({ thumb: 'https://imagedelivery.net/hash/id/public' });
    page.save();
    const save = http.expectOne('/admin/categories/1');
    expect(save.request.body.thumb).toBe('https://imagedelivery.net/hash/id/public');
    save.flush({});
    reload();
  });
  it('preserves the old thumbnail when an upload fails', () => {
    page.edit({ ...category, thumb: 'https://example.com/old.png' });
    page.uploadThumbnail({
      target: { files: [new File(['image'], 'thumb.png', { type: 'image/png' })], value: '' },
    } as unknown as Event);
    http
      .expectOne('/admin/categories/images')
      .flush({ message: 'Falha no upload' }, { status: 502, statusText: 'Bad Gateway' });
    expect(page.thumb).toBe('https://example.com/old.png');
    expect(page.busy()).toBeFalse();
    expect(page.error()).toBe('Falha no upload');
  });
  it('shows disabled categories and re-enables them', () => {
    expect(page.categories()[0].isActive).toBeFalse();
    page.toggle(category);
    const request = http.expectOne('/admin/categories/1');
    expect(request.request.body).toEqual({ isActive: true });
    request.flush({});
    reload();
  });
  it('creates a category with name, thumbnail and status', () => {
    page.edit();
    page.name = ' Pintura ';
    page.thumb = 'https://example.com/image.jpg';
    page.save();
    const request = http.expectOne('/admin/categories');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Pintura', thumb: page.thumb, isActive: true });
    request.flush({});
    reload();
    expect(page.editing()).toBeFalse();
  });
  it('keeps the confirmation open and shows deletion conflicts', () => {
    page.deleting.set(category);
    page.remove();
    http
      .expectOne('/admin/categories/1')
      .flush({ message: 'Categoria possui vínculos.' }, { status: 409, statusText: 'Conflict' });
    expect(page.error()).toBe('Categoria possui vínculos.');
    expect(page.deleting()).toEqual(category);
    expect(page.busy()).toBeFalse();
  });
  it('does not submit empty names or unsafe image URLs', () => {
    page.edit();
    page.name = ' ';
    page.save();
    page.name = 'Limpeza';
    page.thumb = 'javascript:alert(1)';
    page.save();
    expect(page.validThumb()).toBeFalse();
    http.expectNone('/admin/categories');
  });
});
