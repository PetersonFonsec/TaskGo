import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { ProviderAdminService } from './provider-admin.service';

describe('ProviderAdminService', () => {
  let service: ProviderAdminService;
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
            adminTokenStorageKey: 'proxi.backoffice.test.adminToken',
          },
        },
      ],
    });

    service = TestBed.inject(ProviderAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('lists providers with typed filters', () => {
    service
      .list({
        page: 2,
        limit: 50,
        status: 'PENDING',
        submittedFrom: '2026-07-01T00:00:00.000Z',
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:3000/admin/providers' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '50' &&
        candidate.params.get('status') === 'PENDING' &&
        candidate.params.get('submittedFrom') === '2026-07-01T00:00:00.000Z',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { total: 0, page: 2, limit: 50, totalPages: 1 } });
  });

  it('loads provider dashboard metrics with optional reporting window', () => {
    service
      .dashboard({
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'http://localhost:3000/admin/dashboard/providers' &&
        candidate.params.get('from') === '2026-07-01T00:00:00.000Z' &&
        candidate.params.get('to') === '2026-07-31T23:59:59.999Z',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      period: {
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        defaultDays: 30,
        maxDays: 90,
      },
      queue: { pending: 0 },
      decisions: { approve: 0, reject: 0, block: 0, unblock: 0, total: 0 },
      reviewDuration: { averageMs: null, averageHours: null, reviewedProviders: 0 },
      recentSensitiveActions: [],
    });
  });

  it('uses command-specific provider decision endpoints', () => {
    service.approve('42').subscribe();
    expectPost('/providers/42/approve').flush({ provider: lifecycle('APPROVED') });

    service.reject('42', 'Missing document').subscribe();
    const reject = expectPost('/providers/42/reject');
    expect(reject.request.body).toEqual({ reason: 'Missing document' });
    reject.flush({ provider: lifecycle('REJECTED') });

    service.block('42', 'Operational risk').subscribe();
    const block = expectPost('/providers/42/block');
    expect(block.request.body).toEqual({ reason: 'Operational risk' });
    block.flush({ provider: lifecycle('BLOCKED') });

    service.unblock('42', 'Review cleared').subscribe();
    const unblock = expectPost('/providers/42/unblock');
    expect(unblock.request.body).toEqual({ reason: 'Review cleared' });
    unblock.flush({ provider: lifecycle('APPROVED') });
  });

  function expectPost(path: string) {
    const request = http.expectOne(`http://localhost:3000/admin${path}`);
    expect(request.request.method).toBe('POST');
    return request;
  }
});

function lifecycle(current: string) {
  return {
    id: '42',
    verification: { providerVerified: current === 'APPROVED' },
    status: { current, changedAt: '2026-07-04T12:00:00.000Z' },
  };
}
