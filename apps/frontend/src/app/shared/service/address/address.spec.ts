import { environment } from '@environments/environment';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Address } from './address';

describe('Address', () => {
  let service: Address;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Address);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('requests the addresses for the selected user with the requested limit', () => {
    service.getAddress('customer-1', 5).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/address?userId=customer-1&limit=5`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [] });
  });
});
