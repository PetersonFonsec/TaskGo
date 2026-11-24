import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';
import { CategoryServicesPage } from './category-services.page';

describe('CategoryServicesPage', () => {
  let page: CategoryServicesPage;
  let http: HttpTestingController;
  const url = '/admin/categories/7/services';
  const faxina = {
    id: '3',
    name: 'Faxina',
    description: 'Limpeza completa',
    sortOrder: 2,
    isActive: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: { apiUrl: '/admin' } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
      ],
    });
    page = TestBed.createComponent(CategoryServicesPage).componentInstance;
    http = TestBed.inject(HttpTestingController);
    reload();
  });
  afterEach(() => http.verify());

  function reload(categoryActive = true) {
    http
      .expectOne((request) => request.method === 'GET' && request.url === url)
      .flush({
        category: { id: '7', name: 'Limpeza', isActive: categoryActive },
        data: [faxina],
      });
  }

  it('loads the services of the category', () => {
    expect(page.categoryName()).toBe('Limpeza');
    expect(page.services()).toEqual([faxina]);
    expect(page.loaded()).toBeTrue();
  });

  it('creates a service after the last one in the list', () => {
    page.edit();
    expect(page.sortOrder).toBe(3);
    page.name = ' Passadoria ';
    page.description = ' ';
    page.save();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Passadoria',
      description: '',
      sortOrder: 3,
      isActive: true,
    });
    request.flush({});
    reload();
    expect(page.editing()).toBeFalse();
    expect(page.success()).toBe('Serviço salvo.');
  });

  it('edits an existing service', () => {
    page.edit(faxina);
    page.name = 'Faxina pesada';
    page.save();
    const request = http.expectOne(`${url}/3`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.name).toBe('Faxina pesada');
    request.flush({});
    reload();
  });

  it('disables a service', () => {
    page.toggle(faxina);
    const request = http.expectOne(`${url}/3`);
    expect(request.request.body).toEqual({ isActive: false });
    request.flush({});
    reload();
    expect(page.success()).toBe('Serviço desabilitado.');
  });

  it('keeps the form open and shows a duplicated name', () => {
    page.edit();
    page.name = 'faxina';
    page.save();
    http
      .expectOne(url)
      .flush(
        { message: 'Já existe um serviço com esse nome nesta categoria.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(page.editing()).toBeTrue();
    expect(page.error()).toBe('Já existe um serviço com esse nome nesta categoria.');
    expect(page.busy()).toBeFalse();
  });

  it('deletes a service after confirmation', () => {
    page.deleting.set(faxina);
    page.remove();
    const request = http.expectOne(`${url}/3`);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    reload();
    expect(page.deleting()).toBeNull();
  });

  it('does not submit empty names or invalid order', () => {
    page.edit();
    page.name = ' ';
    page.save();
    page.name = 'Passadoria';
    page.sortOrder = -1;
    page.save();
    page.sortOrder = 1.5;
    page.save();
    expect(page.validSortOrder()).toBeFalse();
    http.expectNone(url);
  });
});
