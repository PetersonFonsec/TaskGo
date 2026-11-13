import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API } from '../../../testing/fakes';
import { CatalogService, matchesSearch } from './catalog.service';

describe('CatalogService', () => {
  let catalog: CatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } }
      ]
    });
    catalog = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the active categories', async () => {
    const result = firstValueFrom(catalog.categories());
    http
      .expectOne(`${API}/categories?limit=100`)
      .flush({ data: [{ id: 1, name: 'Elétrica', slug: 'eletrica' }], meta: {} });
    expect(await result).toEqual([{ id: 1, name: 'Elétrica', slug: 'eletrica' }]);
  });

  it('finds providers by category slug and location', async () => {
    const result = firstValueFrom(catalog.providersByCategory('ar condicionado', { lat: -23.7, lng: -46.6 }));
    const request = http.expectOne((r) => r.url === `${API}/provider/by-category/ar%20condicionado`);
    expect(request.request.params.get('lat')).toBe('-23.7');
    expect(request.request.params.get('lng')).toBe('-46.6');
    request.flush([]);
    expect(await result).toEqual([]);
  });

  it('searches ignoring accents and case', () => {
    expect(matchesSearch('Elétrica', 'ELETRI')).toBeTrue();
    expect(matchesSearch('Encanamento', ' CANA ')).toBeTrue();
    expect(matchesSearch('Pintura', 'eletrica')).toBeFalse();
  });
});
