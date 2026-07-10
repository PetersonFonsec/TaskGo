import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  AuthLoginRequest,
  CustomerAuthSession,
  UserRegistrationRequest,
} from '@taskgo/shared';
import { environment } from '@environments/environment';

import { UserRegister } from './user-register';
import { UserLoggedService } from '../user-logged/user-logged.service';
import { TokenService } from '../token/token.service';

describe('UserRegister', () => {
  let service: UserRegister;
  let httpMock: HttpTestingController;
  let userLoggedService: jasmine.SpyObj<UserLoggedService>;
  let assignedToken = '';

  beforeEach(() => {
    userLoggedService = jasmine.createSpyObj<UserLoggedService>('UserLoggedService', [
      'setUserLogged',
    ]);
    const tokenService = {
      set token(value: string) {
        assignedToken = value;
      },
      get token() {
        return assignedToken;
      },
      clearToken: jasmine.createSpy('clearToken'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserLoggedService, useValue: userLoggedService },
        { provide: TokenService, useValue: tokenService },
      ],
    });
    service = TestBed.inject(UserRegister);
    httpMock = TestBed.inject(HttpTestingController);
    assignedToken = '';
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('flushes a shared customer session response to login subscribers', () => {
    const payload: AuthLoginRequest = {
      email: 'customer@example.com',
      password: 'secret',
    };
    const response = buildCustomerSession();

    service.login(payload).subscribe((session) => {
      expect(session).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.url}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush(response);

    expect(assignedToken).toBe('TOKEN');
    expect(userLoggedService.setUserLogged).toHaveBeenCalledWith(response as any);
  });

  it('submits a shared registration payload without local-only step fields', () => {
    const payload: UserRegistrationRequest = {
      name: 'Customer',
      email: 'customer@example.com',
      password: 'secret',
      phone: '11999999999',
      cpf: '12345678900',
      type: 'CLIENTE',
      address: {
        label: 'Principal',
        street: 'Rua A',
        number: '10',
        city: 'Sao Paulo',
        state: 'SP',
        cep: '01001000',
        lat: -23.55,
        lng: -46.63,
      },
      social: {
        whatsapp: '11999999999',
        instagram: 'taskgo',
        facebook: '',
        linkdin: '',
      },
      services: [],
    };
    const response = buildCustomerSession();

    service.registerUser(payload).subscribe((session) => {
      expect(session).toEqual(response);
    });

    const request = httpMock.expectOne(`${environment.url}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ user: payload });
    expect(request.request.body.user.completeSteps).toBeUndefined();

    request.flush(response);

    expect(assignedToken).toBe('TOKEN');
    expect(userLoggedService.setUserLogged).toHaveBeenCalledWith(response as any);
  });
});

function buildCustomerSession(): CustomerAuthSession {
  return {
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
}
