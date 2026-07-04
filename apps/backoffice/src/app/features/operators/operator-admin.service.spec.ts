import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { OperatorAdminService } from './operator-admin.service';

describe('OperatorAdminService', () => {
  let service: OperatorAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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

    service = TestBed.inject(OperatorAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('lists operators with bounded typed filters', () => {
    service.list({ page: 2, limit: 50, role: 'SUPPORT', active: false, search: 'sam' }).subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:3000/admin/users' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '50' &&
        candidate.params.get('role') === 'SUPPORT' &&
        candidate.params.get('active') === 'false' &&
        candidate.params.get('search') === 'sam'
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { total: 0, page: 2, limit: 50, totalPages: 1 } });
  });

  it('uses the administrative user lifecycle endpoints', () => {
    service.invite({ name: 'Sam Support', email: 'sam@example.com', role: 'SUPPORT' }).subscribe();
    const invite = http.expectOne('http://localhost:3000/admin/users/invitations');
    expect(invite.request.method).toBe('POST');
    expect(invite.request.body).toEqual({
      name: 'Sam Support',
      email: 'sam@example.com',
      role: 'SUPPORT'
    });
    invite.flush({
      operator: operator(),
      invitation: { expiresAt: '2026-07-06T12:00:00.000Z', deliveryStatus: 'SENT' }
    });

    service.changeRole('7', 'FINANCE').subscribe();
    const role = http.expectOne('http://localhost:3000/admin/users/7/role');
    expect(role.request.method).toBe('PATCH');
    expect(role.request.body).toEqual({ role: 'FINANCE' });
    role.flush({ operator: operator({ role: 'FINANCE' }) });

    service.activate('7').subscribe();
    expectPost('/users/7/activate').flush({ operator: operator({ active: true }) });

    service.deactivate('7').subscribe();
    expectPost('/users/7/deactivate').flush({ operator: operator({ active: false }) });
  });

  function expectPost(path: string) {
    const request = http.expectOne(`http://localhost:3000/admin${path}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    return request;
  }
});

function operator(overrides: Record<string, unknown> = {}) {
  return {
    id: '7',
    name: 'Sam Support',
    email: 'sam@example.com',
    role: 'SUPPORT',
    active: false,
    activatedAt: null,
    ...overrides
  };
}
