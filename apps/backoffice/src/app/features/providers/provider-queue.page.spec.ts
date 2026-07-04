import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { ProviderPage, ProviderQueueItem } from './provider-admin.models';
import { ProviderAdminService } from './provider-admin.service';
import { ProviderQueuePage } from './provider-queue.page';

describe('ProviderQueuePage', () => {
  let fixture: ComponentFixture<ProviderQueuePage>;
  let component: ProviderQueuePage;
  let routeQuery: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeSnapshotQuery = convertToParamMap({ page: '3', limit: '25' });
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routeQuery = new BehaviorSubject(routeSnapshotQuery);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [ProviderQueuePage],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ProviderAdminService,
          useValue: {
            list: jasmine.createSpy('list').and.returnValue(of(emptyProviderPage()))
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: routeQuery.asObservable(),
            snapshot: { queryParamMap: routeSnapshotQuery }
          }
        },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(ProviderQueuePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('updates URL filters and resets paging deterministically', () => {
    component.filters.set({
      status: 'APPROVED',
      submittedFrom: '2026-07-01',
      submittedTo: '2026-07-04'
    });

    component.applyFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: {
        page: 1,
        limit: 25,
        status: 'APPROVED',
        submittedFrom: '2026-07-01T00:00:00.000Z',
        submittedTo: '2026-07-04T23:59:59.999Z'
      }
    });
  });

  it('clears filters and preserves explicit page navigation', () => {
    component.filters.set({
      status: 'BLOCKED',
      submittedFrom: '2026-07-01',
      submittedTo: '2026-07-04'
    });

    component.clearFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 1, limit: 25 }
    });

    component.goToPage(2);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 2, limit: 25 }
    });
  });

  it('shows a visible error when the queue cannot load', () => {
    const failingService = TestBed.inject(
      ProviderAdminService
    ) as jasmine.SpyObj<ProviderAdminService>;
    failingService.list.and.returnValue(throwError(() => new Error('network')));

    routeQuery.next(convertToParamMap({ page: '1' }));
    fixture.detectChanges();

    expect(component.error()).toBe('Provider queue could not be loaded.');
    expect(fixture.nativeElement.textContent).toContain('Provider queue could not be loaded.');
  });
});

function emptyProviderPage(): ProviderPage<ProviderQueueItem> {
  return {
    data: [],
    meta: {
      total: 0,
      page: 3,
      limit: 25,
      totalPages: 1
    }
  };
}
