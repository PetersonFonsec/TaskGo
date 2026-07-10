import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { AdminOperatorProfile } from '@taskgo/shared';
import { adminJwt } from '@app/core/auth/admin-auth.service.spec';
import { ProviderDashboard } from '@app/features/providers/provider-admin.models';
import { ProviderAdminService } from '@app/features/providers/provider-admin.service';

import { DashboardPage } from './dashboard.page';

const operator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z',
};

describe('DashboardPage', () => {
  let service: jasmine.SpyObj<ProviderAdminService>;

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('renders empty metrics as zeros and avoids invalid averages', () => {
    const { fixture } = setup('ADMINISTRATOR', emptyDashboard());

    expect(text(fixture)).toContain('Pending providers');
    expect(text(fixture)).toContain('No completed provider reviews');
    expect(text(fixture)).toContain('0 total actions');
    expect(text(fixture)).toContain('No sensitive provider actions were recorded');
  });

  it('requests and renders the selected reporting window', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-07-04T12:00:00.000Z'));
    try {
      const { fixture } = setup('ADMINISTRATOR', seededDashboard());

      service.dashboard.and.returnValue(of(seededDashboard({ approve: 5 })));
      selectPeriod(fixture, '7');
      fixture.detectChanges();

      expect(service.dashboard).toHaveBeenCalledWith({
        from: '2026-06-28T00:00:00.000Z',
        to: '2026-07-04T23:59:59.999Z',
      });
      expect(text(fixture)).toContain('5');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('preserves provider queue filters in metric links', () => {
    const { fixture } = setup('SUPPORT', seededDashboard());
    const pendingCard = fixture.debugElement.queryAll(By.css('.metric-card'))[0];
    const href = pendingCard.nativeElement.getAttribute('href') as string;

    expect(href).toContain('/providers');
    expect(href).toContain('status=PENDING');
    expect(href).toContain('submittedFrom=2026-07-01T00:00:00.000Z');
  });

  it('denies Finance and Moderator without loading dashboard metrics', () => {
    const finance = setup('FINANCE', emptyDashboard()).fixture;
    expect(text(finance)).toContain('Dashboard unavailable for FINANCE');
    expect(service.dashboard).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const moderator = setup('MODERATOR', emptyDashboard()).fixture;
    expect(text(moderator)).toContain('Dashboard unavailable for MODERATOR');
    expect(service.dashboard).not.toHaveBeenCalled();
  });

  it('keeps loading and error states accessible', () => {
    const pending = new Subject<ProviderDashboard>();
    const { fixture } = setup('ADMINISTRATOR', pending);

    const loading = fixture.debugElement.query(By.css('[role="status"]'));
    expect(loading.nativeElement.textContent).toContain('Loading provider dashboard metrics');

    pending.error(new Error('network'));
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(alert.nativeElement.textContent).toContain(
      'Provider dashboard metrics could not be loaded.',
    );
    expect(alert.nativeElement.querySelector('button')?.textContent).toContain('Retry');
  });

  function setup(
    role: AdminOperatorProfile['role'],
    response: ProviderDashboard | Subject<ProviderDashboard>,
  ): { fixture: ComponentFixture<DashboardPage> } {
    localStorage.clear();
    service = jasmine.createSpyObj<ProviderAdminService>('ProviderAdminService', ['dashboard']);
    service.dashboard.and.returnValue(
      response instanceof Subject ? response.asObservable() : of(response),
    );

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProviderAdminService, useValue: service },
      ],
    });

    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role }),
      operator: { ...operator, role },
    });

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    return { fixture };
  }
});

function selectPeriod(fixture: ComponentFixture<DashboardPage>, value: string): void {
  const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function text(fixture: ComponentFixture<DashboardPage>): string {
  fixture.detectChanges();
  return fixture.nativeElement.textContent;
}

function emptyDashboard(): ProviderDashboard {
  return seededDashboard({
    pending: 0,
    approve: 0,
    reject: 0,
    block: 0,
    unblock: 0,
    total: 0,
    averageHours: null,
    reviewedProviders: 0,
    actions: [],
  });
}

function seededDashboard(overrides: Partial<DashboardSeed> = {}): ProviderDashboard {
  const seed: DashboardSeed = {
    pending: 3,
    approve: 2,
    reject: 1,
    block: 1,
    unblock: 0,
    total: 4,
    averageHours: 5.5,
    reviewedProviders: 3,
    actions: [
      {
        id: '900',
        action: 'BLOCK',
        fromStatus: 'APPROVED',
        toStatus: 'BLOCKED',
        reason: 'Policy risk',
        createdAt: '2026-07-04T13:00:00.000Z',
        provider: {
          id: '42',
          status: 'BLOCKED',
          name: 'Provider Example',
          email: 'provider@example.com',
        },
        actor: {
          id: '42',
          role: 'ADMINISTRATOR',
          name: 'Admin Operator',
          email: 'admin@example.com',
          active: true,
        },
      },
    ],
    ...overrides,
  };

  return {
    period: {
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      defaultDays: 30,
      maxDays: 90,
    },
    queue: { pending: seed.pending },
    decisions: {
      approve: seed.approve,
      reject: seed.reject,
      block: seed.block,
      unblock: seed.unblock,
      total: seed.total,
    },
    reviewDuration: {
      averageMs: seed.averageHours === null ? null : seed.averageHours * 3_600_000,
      averageHours: seed.averageHours,
      reviewedProviders: seed.reviewedProviders,
    },
    recentSensitiveActions: seed.actions,
  };
}

interface DashboardSeed {
  readonly pending: number;
  readonly approve: number;
  readonly reject: number;
  readonly block: number;
  readonly unblock: number;
  readonly total: number;
  readonly averageHours: number | null;
  readonly reviewedProviders: number;
  readonly actions: ProviderDashboard['recentSensitiveActions'];
}
