import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';
import type { AdminOperatorProfile } from '@taskgo/shared';

import { AdminAuthService } from './admin-auth.service';

const operator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BACKOFFICE_ENVIRONMENT,
          useValue: {
            production: false,
            apiUrl: 'http://localhost:3000/admin',
            adminTokenStorageKey: 'proxi.backoffice.test.adminToken'
          }
        }
      ]
    });

    service = TestBed.inject(AdminAuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('stores only the Backoffice administrative token and identity after login', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });

    service.login({ email: 'admin@example.com', password: 'secret' }).subscribe((session) => {
      expect(session.token).toBe(token);
      expect(session.operator).toEqual(operator);
    });

    const request = http.expectOne('http://localhost:3000/admin/auth/login');
    expect(request.request.method).toBe('POST');
    request.flush({ access_token: token, operator });

    expect(localStorage.getItem('proxi.backoffice.test.adminToken')).toBe(token);
    expect(localStorage.getItem('proxi.backoffice.test.adminToken.identity')).toContain(
      'admin@example.com'
    );
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('rejects an ordinary marketplace token when establishing a Backoffice session', () => {
    const ordinaryToken = adminJwt({ tokenKind: 'user', role: 'CUSTOMER' });

    expect(() => service.establishSession({ token: ordinaryToken, operator })).toThrowError(
      /administrative token/
    );
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('proxi.backoffice.test.adminToken')).toBeNull();
  });

  it('refreshes the current operator and logs out to login', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    service.establishSession({ token, operator });

    service.refreshCurrentOperator().subscribe((session) => {
      expect(session.operator.name).toBe('Updated Operator');
    });

    http.expectOne('http://localhost:3000/admin/auth/me').flush({
      operator: { ...operator, name: 'Updated Operator' }
    });

    expect(service.operator()?.name).toBe('Updated Operator');

    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('expires the session when refreshing without a stored token', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/operators');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    service.refreshCurrentOperator().subscribe({
      error: (error) => {
        expect(error.message).toContain('Missing administrative token');
      }
    });

    http.expectOne('http://localhost:3000/admin/auth/me').flush({ operator });

    expect(service.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { returnUrl: '/operators' }
    });
  });

  it('expires the session once and preserves root return URL on login routes', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/login');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.establishSession({ token, operator });

    service.expireSession();
    service.expireSession();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('redirects expired non-login sessions back to their current URL', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/providers');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.establishSession({ token, operator });

    service.expireSession();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { returnUrl: '/providers' }
    });
  });
});

export function adminJwt(payload: Record<string, unknown>): string {
  return [
    base64Url({ alg: 'none', typ: 'JWT' }),
    base64Url({ sub: '42', ver: 1, ...payload }),
    'signature'
  ].join('.');
}

function base64Url(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
