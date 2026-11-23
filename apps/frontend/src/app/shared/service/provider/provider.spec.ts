import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

import { Provider } from './provider';
import { ProviderAvailabilityResponse } from './provider.model';

describe('Provider', () => {
  let service: Provider;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(Provider);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request all providers with coordinates when no category is selected', () => {
    service.findProvidersByCategorySlug(undefined, { lat: -23.5505, lng: -46.6333 }).subscribe();
    const request = httpMock.expectOne((req) => req.url === `${environment.url}/provider`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lat')).toBe('-23.5505');
    expect(request.request.params.get('lng')).toBe('-46.6333');
    request.flush([]);
  });

  it('should request the category endpoint when a category is selected', () => {
    service.findProvidersByCategorySlug('limpeza').subscribe();
    const request = httpMock.expectOne(`${environment.url}/provider/by-category/limpeza`);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('requests a page of favorites with skip and take', () => {
    service.listFavorites('client-1', { skip: 40, take: 20 }).subscribe();
    const request = httpMock.expectOne(
      (req) =>
        req.url === `${environment.url}/favorites` &&
        req.params.get('skip') === '40' &&
        req.params.get('take') === '20',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], total: 40 });
  });

  it('sends the search filters as API query params', () => {
    service
      .findProvidersByCategorySlug('encanadores', {
        lat: -23.5,
        lng: -46.6,
        onlyFavorites: true,
        minimumRating: 4,
        maximumDistance: 10,
        minimumPrice: 100,
        maximumPrice: 250,
      })
      .subscribe();
    const request = httpMock.expectOne(
      (req) => req.url === `${environment.url}/provider/by-category/encanadores`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('lat')).toBe('-23.5');
    expect(request.request.params.get('lng')).toBe('-46.6');
    expect(request.request.params.get('minimumRating')).toBe('4');
    expect(request.request.params.get('maximumDistance')).toBe('10');
    expect(request.request.params.get('minimumPrice')).toBe('100');
    expect(request.request.params.get('maximumPrice')).toBe('250');
    expect(request.request.params.get('onlyFavorites')).toBe('true');
    request.flush([]);
  });

  it('should call the provider availability endpoint with date range params', () => {
    const response: ProviderAvailabilityResponse = {
      providerId: 'provider-1',
      timezone: 'America/Sao_Paulo',
      days: [
        {
          date: '2026-06-22',
          available: true,
          slots: [
            {
              startsAt: '2026-06-22T12:00:00.000Z',
              endsAt: '2026-06-22T13:00:00.000Z',
              serviceId: 'service-1',
              label: '09:00',
              available: true,
            },
          ],
        },
      ],
    };

    service
      .getAvailability('provider-1', {
        from: '2026-06-22',
        to: '2026-06-28',
      })
      .subscribe((availability) => {
        expect(availability.days[0].slots[0].startsAt).toBe('2026-06-22T12:00:00.000Z');
        expect(availability.days[0].slots[0].label).toBe('09:00');
      });

    const request = httpMock.expectOne(
      (req) => req.url === `${environment.url}/provider/provider-1/availability`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-06-22');
    expect(request.request.params.get('to')).toBe('2026-06-28');
    expect(request.request.params.has('serviceId')).toBeFalse();

    request.flush(response);
  });

  it('should include serviceId when requesting provider availability for one service', () => {
    service
      .getAvailability('provider-1', {
        from: '2026-06-22',
        to: '2026-06-28',
        serviceId: 'service-1',
      })
      .subscribe();

    const request = httpMock.expectOne(
      (req) => req.url === `${environment.url}/provider/provider-1/availability`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe('2026-06-22');
    expect(request.request.params.get('to')).toBe('2026-06-28');
    expect(request.request.params.get('serviceId')).toBe('service-1');

    request.flush({
      providerId: 'provider-1',
      timezone: 'America/Sao_Paulo',
      days: [],
    } satisfies ProviderAvailabilityResponse);
  });
});
