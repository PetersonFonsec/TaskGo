import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
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

    service = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('serializes combined filters exactly to supported audit API parameters', () => {
    service
      .list({
        page: 2,
        limit: 50,
        operatorId: '42',
        action: 'PROVIDER_BLOCKED',
        entityType: 'Provider',
        entityId: '700',
        requestId: 'req-123',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-04T23:59:59.999Z',
      })
      .subscribe();

    const request = http.expectOne((candidate) => {
      const keys = candidate.params.keys().sort();
      return (
        candidate.url === 'http://localhost:3000/admin/audit-logs' &&
        JSON.stringify(keys) ===
          JSON.stringify([
            'action',
            'entityId',
            'entityType',
            'from',
            'limit',
            'operatorId',
            'page',
            'requestId',
            'to',
          ]) &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '50' &&
        candidate.params.get('operatorId') === '42' &&
        candidate.params.get('action') === 'PROVIDER_BLOCKED' &&
        candidate.params.get('entityType') === 'Provider' &&
        candidate.params.get('entityId') === '700' &&
        candidate.params.get('requestId') === 'req-123' &&
        candidate.params.get('from') === '2026-07-01T00:00:00.000Z' &&
        candidate.params.get('to') === '2026-07-04T23:59:59.999Z'
      );
    });

    expect(request.request.method).toBe('GET');
    request.flush({ data: [], meta: { total: 0, page: 2, limit: 50, totalPages: 1 } });
  });

  it('loads audit details without mutation endpoints', () => {
    service.get('900').subscribe();

    const request = http.expectOne('http://localhost:3000/admin/audit-logs/900');
    expect(request.request.method).toBe('GET');
    request.flush({ auditLog: auditLog() });
  });
});

function auditLog() {
  return {
    id: '900',
    action: 'PROVIDER_BLOCKED',
    target: { type: 'Provider', id: '700' },
    actor: {
      id: '42',
      role: 'ADMINISTRATOR',
      name: 'Admin Operator',
      email: 'admin@example.com',
      active: true,
    },
    reason: 'Policy risk',
    requestId: 'req-123',
    createdAt: '2026-07-04T13:00:00.000Z',
    before: { status: 'APPROVED' },
    after: { status: 'BLOCKED' },
    context: { ipAddress: '127.0.0.1', userAgent: 'Cypress' },
  };
}
