import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AuthLoginRequest, CustomerAuthSession } from '@taskgo/shared';
import { environment } from '@environments/environment';

import { Login } from './login';

describe('Login', () => {
  let service: Login;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(Login);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts the shared login request shape to /auth/login', () => {
    const payload: AuthLoginRequest = {
      email: 'customer@example.com',
      password: 'secret',
    };
    const response: CustomerAuthSession = {
      access_token: 'TOKEN',
      user: {
        id: '1',
        name: 'Customer',
        email: 'customer@example.com',
        phone: '11999999999',
        cpf: '12345678900',
        type: 'CLIENTE',
      },
    };

    service.registerUser(payload).subscribe((session) => {
      expect(session).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.url}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush(response);
  });
});
