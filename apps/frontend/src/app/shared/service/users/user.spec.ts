import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PublicUserProfile, UserProfileUpdateRequest } from '@taskgo/shared';
import { environment } from '@environments/environment';

import { User } from './user';

describe('User', () => {
  let service: User;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(User);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('flushes a shared public profile response from /user/:id', () => {
    const response = buildPublicProfile();

    service.getUser('1').subscribe((profile) => {
      expect(profile).toEqual(response);
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).orders).toBeUndefined();
      expect((profile as any).provider).toBeUndefined();
    });

    const request = httpMock.expectOne(`${environment.url}/user/1`);
    expect(request.request.method).toBe('GET');

    request.flush(response);
  });

  it('patches only shared editable profile fields', () => {
    const payload: UserProfileUpdateRequest = {
      name: 'Updated User',
      email: 'updated@example.com',
      phone: '+5511888888888',
    };
    const response = {
      ...buildPublicProfile(),
      ...payload,
    };

    service.updateUser('1', payload).subscribe((profile) => {
      expect(profile.name).toBe('Updated User');
      expect(profile.email).toBe('updated@example.com');
    });

    const request = httpMock.expectOne(`${environment.url}/user/1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    expect(request.request.body.id).toBeUndefined();
    expect(request.request.body.passwordHash).toBeUndefined();
    expect(request.request.body.orders).toBeUndefined();

    request.flush(response);
  });
});

function buildPublicProfile(): PublicUserProfile {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+5511999999999',
    cpf: '12345678900',
    type: 'CLIENTE',
    photoUrl: '',
    addresses: [
      {
        id: 'address-1',
        label: 'Home',
        street: 'Rua Exemplo',
        city: 'Sao Paulo',
        state: 'SP',
        postalCode: '01000-000',
        country: 'BR',
        isPrimary: true,
      },
    ],
  };
}
