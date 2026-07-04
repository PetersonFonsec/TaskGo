import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AuditLogListItem, AuditLogPage } from './audit-log.models';
import { AuditLogService } from './audit-log.service';
import { AuditLogListPage } from './audit-log-list.page';

describe('AuditLogListPage', () => {
  let fixture: ComponentFixture<AuditLogListPage>;
  let component: AuditLogListPage;
  let routeQuery: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeSnapshotQuery = convertToParamMap({
    page: '3',
    limit: '25',
    operatorId: '42',
    action: 'PROVIDER_BLOCKED',
    entityType: 'Provider',
    entityId: '700',
    from: '2026-07-01T00:00:00.000Z',
    to: '2026-07-04T23:59:59.999Z',
  });
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routeQuery = new BehaviorSubject(routeSnapshotQuery);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [AuditLogListPage],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuditLogService,
          useValue: {
            list: jasmine.createSpy('list').and.returnValue(of(emptyAuditPage())),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: routeQuery.asObservable(),
            snapshot: { queryParamMap: routeSnapshotQuery },
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    fixture = TestBed.createComponent(AuditLogListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('updates combined filters and resets paging deterministically', () => {
    component.filters.set({
      operatorId: '42',
      action: 'provider_blocked',
      entityType: 'Provider',
      entityId: '700',
      requestId: 'req-123',
      from: '2026-07-01',
      to: '2026-07-04',
    });

    component.applyFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        page: 1,
        limit: 25,
        operatorId: '42',
        action: 'PROVIDER_BLOCKED',
        entityType: 'Provider',
        entityId: '700',
        requestId: 'req-123',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-04T23:59:59.999Z',
      },
    });
  });

  it('preserves filters and page when opening and returning from details', () => {
    expect(component.detailQueryParams()).toEqual({
      page: 3,
      limit: 25,
      operatorId: '42',
      action: 'PROVIDER_BLOCKED',
      entityType: 'Provider',
      entityId: '700',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-04T23:59:59.999Z',
    });

    component.goToPage(2);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        page: 2,
        limit: 25,
        operatorId: '42',
        action: 'PROVIDER_BLOCKED',
        entityType: 'Provider',
        entityId: '700',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-04T23:59:59.999Z',
      },
    });
  });

  it('bounds invalid route paging and clears filters back to defaults', () => {
    const parsed = component.queryFromParamMap(
      convertToParamMap({
        page: '0',
        limit: '500',
        operatorId: '',
      }),
    );

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(100);
    expect(parsed.action).toBeUndefined();

    component.filters.set({
      operatorId: '42',
      action: 'PROVIDER_BLOCKED',
      entityType: 'Provider',
      entityId: '700',
      requestId: 'req-123',
      from: '2026-07-01',
      to: '2026-07-04',
    });
    component.clearFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 1, limit: 25 },
    });
  });

  it('uses current route defaults when applying filters before a page is loaded', () => {
    component.page.set(null);
    component.filters.set({
      operatorId: '',
      action: '',
      entityType: '',
      entityId: '',
      requestId: '',
      from: '',
      to: '',
    });

    component.applyFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 1, limit: 25 },
    });
  });

  it('shows an accessible error when audit records cannot load', () => {
    const failingService = TestBed.inject(AuditLogService) as jasmine.SpyObj<AuditLogService>;
    failingService.list.and.returnValue(throwError(() => new Error('network')));

    routeQuery.next(convertToParamMap({ page: '1' }));
    fixture.detectChanges();

    expect(component.error()).toBe('Audit records could not be loaded.');
    expect(fixture.nativeElement.textContent).toContain('Audit records could not be loaded.');
  });
});

function emptyAuditPage(): AuditLogPage<AuditLogListItem> {
  return {
    data: [],
    meta: {
      total: 0,
      page: 3,
      limit: 25,
      totalPages: 1,
    },
  };
}
