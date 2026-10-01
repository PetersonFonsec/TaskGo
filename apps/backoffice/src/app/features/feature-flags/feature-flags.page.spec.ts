import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';
import { FeatureFlagsPage } from './feature-flags.page';

describe('FeatureFlagsPage', () => {
  let page: FeatureFlagsPage;
  let http: HttpTestingController;
  const flag = { id: '1', name: 'favorites', description: null, isActive: false };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: { apiUrl: '/admin' } },
      ],
    });
    page = TestBed.createComponent(FeatureFlagsPage).componentInstance;
    http = TestBed.inject(HttpTestingController);
    reload();
  });
  afterEach(() => http.verify());
  function reload() {
    http
      .expectOne((request) => request.method === 'GET' && request.url === '/admin/feature-flags')
      .flush({ data: [flag], meta: { total: 1, totalPages: 1 } });
  }
  it('shows disabled flags and re-enables them', () => {
    expect(page.featureFlags()[0].isActive).toBeFalse();
    page.toggle(flag);
    const request = http.expectOne('/admin/feature-flags/1');
    expect(request.request.body).toEqual({ isActive: true });
    request.flush({});
    reload();
  });
  it('creates a flag with name, description and status', () => {
    page.edit();
    page.name = ' chat ';
    page.description = 'Habilita o chat';
    page.save();
    const request = http.expectOne('/admin/feature-flags');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'chat',
      description: page.description,
      isActive: false,
    });
    request.flush({});
    reload();
    expect(page.editing()).toBeFalse();
  });
  it('keeps the confirmation open and shows deletion conflicts', () => {
    page.deleting.set(flag);
    page.remove();
    http
      .expectOne('/admin/feature-flags/1')
      .flush({ message: 'Não foi possível excluir.' }, { status: 409, statusText: 'Conflict' });
    expect(page.error()).toBe('Não foi possível excluir.');
    expect(page.deleting()).toEqual(flag);
    expect(page.busy()).toBeFalse();
  });
  it('edits a flag and clears its description', () => {
    page.edit({ ...flag, description: 'Old description' });
    page.name = ' updated ';
    page.description = '';
    page.save();
    const request = http.expectOne('/admin/feature-flags/1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'updated', description: '', isActive: false });
    request.flush({});
    reload();
    expect(page.editing()).toBeFalse();
  });
  it('does not submit empty names', () => {
    page.edit();
    page.name = ' ';
    page.save();
    http.expectNone('/admin/feature-flags');
  });
  it('deletes the last record on a page and returns to the previous page', () => {
    page.page = 2;
    page.deleting.set(flag);
    page.remove();
    const request = http.expectOne('/admin/feature-flags/1');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    expect(page.page).toBe(1);
    reload();
    expect(page.deleting()).toBeNull();
  });
});
