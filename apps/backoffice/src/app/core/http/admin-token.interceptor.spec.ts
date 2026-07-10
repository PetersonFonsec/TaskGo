import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { AdminOperatorProfile } from '@taskgo/shared';
import { adminJwt } from '@app/core/auth/admin-auth.service.spec';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { adminTokenInterceptor, isConfiguredAdminApiRequest } from './admin-token.interceptor';

const operator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('adminTokenInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AdminAuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([adminTokenInterceptor])),
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

    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AdminAuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('attaches the token only to configured Proxi admin API requests', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    auth.establishSession({ token, operator });

    client.get('http://localhost:3000/admin/providers').subscribe();
    const adminRequest = http.expectOne('http://localhost:3000/admin/providers');
    expect(adminRequest.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    adminRequest.flush({});

    client.get('http://localhost:3000/services').subscribe();
    const publicRequest = http.expectOne('http://localhost:3000/services');
    expect(publicRequest.request.headers.has('Authorization')).toBeFalse();
    publicRequest.flush({});
  });

  it('clears session and redirects once on 401 responses', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    auth.establishSession({ token, operator });

    client.get('http://localhost:3000/admin/providers').subscribe({
      error: (error: HttpErrorResponse) => expect(error.status).toBe(401)
    });
    http.expectOne('http://localhost:3000/admin/providers').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    client.get('http://localhost:3000/admin/auth/me').subscribe({
      error: (error: HttpErrorResponse) => expect(error.status).toBe(401)
    });
    http.expectOne('http://localhost:3000/admin/auth/me').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(auth.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('clears session on stale-token 403 responses but keeps permission denials', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });
    auth.establishSession({ token, operator });

    client.get('http://localhost:3000/admin/auth/me').subscribe({
      error: (error: HttpErrorResponse) => expect(error.status).toBe(403)
    });
    http.expectOne('http://localhost:3000/admin/auth/me').flush(
      { message: 'Administrative operator is inactive' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(auth.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledTimes(1);

    auth.establishSession({ token, operator });
    client.get('http://localhost:3000/admin/audit-logs').subscribe({
      error: (error: HttpErrorResponse) => expect(error.status).toBe(403)
    });
    http.expectOne('http://localhost:3000/admin/audit-logs').flush(
      { message: 'Forbidden resource' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(auth.isAuthenticated()).toBeTrue();
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('leaves admin API requests unauthenticated when no session exists', () => {
    client.get('http://localhost:3000/admin/providers').subscribe();

    const request = http.expectOne('http://localhost:3000/admin/providers');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('recognizes relative and absolute configured admin API URLs', () => {
    expect(isConfiguredAdminApiRequest('/admin/auth/me', '/admin')).toBeTrue();
    expect(isConfiguredAdminApiRequest('/api/admin/auth/me', '/admin')).toBeFalse();
    expect(
      isConfiguredAdminApiRequest(
        'http://localhost:3000/admin/providers',
        'http://localhost:3000/admin'
      )
    ).toBeTrue();
    expect(
      isConfiguredAdminApiRequest(
        'http://localhost:3001/admin/providers',
        'http://localhost:3000/admin'
      )
    ).toBeFalse();
  });
});
