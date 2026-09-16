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
  it('requests only the authenticated user addresses with the requested limit', () => {
    service.getAddress('customer-1', 5).subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/user/me/addresses?limit=5`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [] });
  });
  it('loads every page of the authenticated user addresses', () => {
    let ids: string[] = [];
    service.getAllAddresses('customer-1').subscribe((addresses) => {
      ids = addresses.map((address) => address.id);
    });
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.url}/user/me/addresses?limit=100&page=1`).flush({
      data: [{ id: 'first' }],
      meta: { page: 1, hasNextPage: true },
    });
    expect(ids).toEqual([]);
    http.expectOne(`${environment.url}/user/me/addresses?limit=100&page=2`).flush({
      data: [{ id: 'last' }],
      meta: { page: 2, hasNextPage: false },
    });
    expect(ids).toEqual(['first', 'last']);
  });

  it('creates and updates using only fields accepted by the API', () => {
    const payload = {
      label: 'Casa',
      street: 'Rua A',
      number: '1',
      complement: '',
      city: 'São Paulo',
      state: 'SP',
      cep: '01001000',
      lat: 0,
      lng: 0,
      neighborhood: '',
      country: '',
      id: '10',
      userId: 'other-user',
    };
    service.createAddress(payload).subscribe();
    const create = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/user/me/addresses`,
    );
    expect(create.request.method).toBe('POST');
    expect(create.request.body.userId).toBeUndefined();
    expect(create.request.body.id).toBeUndefined();
    create.flush({});
    service.updateAddress('10', payload).subscribe();
    const update = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/user/me/addresses/10`,
    );
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(create.request.body);
    update.flush({});
  });

  it('removes the selected address through the authenticated endpoint', () => {
    service.removeAddress('10').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.url}/user/me/addresses/10`,
    );
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });
});
