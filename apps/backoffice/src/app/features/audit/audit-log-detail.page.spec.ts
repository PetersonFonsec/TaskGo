import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { safeAuditDeltaEntries } from './audit-log.models';
import { AuditLogService } from './audit-log.service';
import { AuditLogDetailPage } from './audit-log-detail.page';

describe('AuditLogDetailPage', () => {
  let fixture: ComponentFixture<AuditLogDetailPage>;
  let component: AuditLogDetailPage;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    routeParams = new BehaviorSubject(convertToParamMap({ id: '900' }));

    TestBed.configureTestingModule({
      imports: [AuditLogDetailPage],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuditLogService,
          useValue: {
            get: jasmine.createSpy('get').and.returnValue(of({ auditLog: auditLog() })),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            snapshot: {
              queryParams: {
                page: 3,
                operatorId: '42',
                action: 'PROVIDER_BLOCKED',
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AuditLogDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders escaped structured state and omits forbidden fields', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.querySelector('img')).toBeNull();
    expect(element.textContent).not.toContain('token');
    expect(element.textContent).not.toContain('secret-value');
    expect(component.beforeEntries().some((entry) => entry.path.includes('password'))).toBeFalse();
  });

  it('shows actor snapshot, target, reason, request ID, and timestamp', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Admin Operator');
    expect(text).toContain('ADMINISTRATOR #42');
    expect(text).toContain('Provider #700');
    expect(text).toContain('Policy risk');
    expect(text).toContain('req-123');
    expect(text).toContain('Jul 4, 2026');
  });

  it('keeps return query params for investigation state restoration', () => {
    expect(component.returnQueryParams()).toEqual({
      page: 3,
      operatorId: '42',
      action: 'PROVIDER_BLOCKED',
    });
  });

  it('surfaces a detail loading error accessibly', () => {
    const failingService = TestBed.inject(AuditLogService) as jasmine.SpyObj<AuditLogService>;
    failingService.get.and.returnValue(throwError(() => new Error('network')));

    routeParams.next(convertToParamMap({ id: '901' }));
    fixture.detectChanges();

    expect(component.error()).toBe('Audit record details could not be loaded.');
    expect(fixture.nativeElement.textContent).toContain('Audit record details could not be loaded.');
  });

  it('handles a missing route identifier without calling the API', () => {
    const service = TestBed.inject(AuditLogService) as jasmine.SpyObj<AuditLogService>;

    routeParams.next(convertToParamMap({}));
    fixture.detectChanges();

    expect(service.get.calls.count()).toBe(1);
    expect(component.error()).toBe('Audit record was not found.');
    expect(component.loading()).toBeFalse();
  });
});

describe('safeAuditDeltaEntries', () => {
  it('filters secret-like keys from nested state deltas', () => {
    expect(
      safeAuditDeltaEntries({
        status: 'APPROVED',
        nested: { invitationToken: 'secret-value', safe: true },
      }),
    ).toEqual([
      { path: 'status', value: 'APPROVED' },
      { path: 'nested.safe', value: 'true' },
    ]);
  });

  it('represents empty arrays, empty objects, nulls, and nested arrays safely', () => {
    expect(safeAuditDeltaEntries({ emptyArray: [], emptyObject: {}, value: null })).toEqual([
      { path: 'emptyArray', value: '[]' },
      { path: 'emptyObject', value: '{}' },
      { path: 'value', value: 'null' },
    ]);
    expect(safeAuditDeltaEntries({ items: [{ status: 'BLOCKED' }] })).toEqual([
      { path: 'items[0].status', value: 'BLOCKED' },
    ]);
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
      active: false,
    },
    reason: 'Policy risk',
    requestId: 'req-123',
    createdAt: '2026-07-04T13:00:00.000Z',
    before: {
      status: 'APPROVED',
      passwordHash: 'secret-value',
      message: '<img src=x onerror=alert(1)>',
    },
    after: {
      status: 'BLOCKED',
      nested: {
        sessionToken: 'secret-value',
        reasonCode: 'POLICY',
      },
    },
    context: { ipAddress: '127.0.0.1', userAgent: 'Unit test' },
  };
}
