import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@environments/environment.development';
import { CategoryService } from './category';

describe('CategoryService', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the category list', () => {
    service.getCategories().subscribe();
    const request = http.expectOne(`${environment.url}/categories`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [] });
  });

  it('requests a category by its ID', () => {
    service.getCategoryById('category-1').subscribe();
    const request = http.expectOne(`${environment.url}/categories/category-1`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'category-1', subCategories: [] });
  });
});
