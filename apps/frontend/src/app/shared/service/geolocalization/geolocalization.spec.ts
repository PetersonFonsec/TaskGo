import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Geolocalization } from './geolocalization';

describe('Geolocalization', () => {
  let service: Geolocalization;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Geolocalization);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('normalizes CEP and returns coordinates without making a fallback request', () => {
    const received = jasmine.createSpy('received');
    service.getLatLngByCep('01001-000').subscribe(received);
    const request = TestBed.inject(HttpTestingController).expectOne(
      'https://brasilapi.com.br/api/cep/v2/01001000',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ cep: '01001000', latitude: -23.55, longitude: -46.63 });
    expect(received).toHaveBeenCalledWith(
      jasmine.objectContaining({
        latitude: -23.55,
        longitude: -46.63,
        provider: 'brasilapi',
      }),
    );
  });
});
