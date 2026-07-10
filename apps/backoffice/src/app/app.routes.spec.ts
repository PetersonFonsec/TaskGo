import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { AdminOperatorProfile } from '@taskgo/shared';
import { adminJwt } from '@app/core/auth/admin-auth.service.spec';
import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { DashboardPage } from './features/dashboard/dashboard.page';
import { LoginPage } from './features/login/login.page';
import { routes } from './app.routes';

const operator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z',
};

describe('Backoffice route/session integration', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
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
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('redirects anonymous visitors to login and returns after login', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/providers', LoginPage);
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fproviders');

    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' }),
      operator,
    });

    await TestBed.inject(Router).navigateByUrl('/providers');
    expect(TestBed.inject(Router).url).toBe('/providers');
  });

  it('does not expose operator administration to non-Administrator sessions', async () => {
    const harness = await RouterTestingHarness.create();
    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'SUPPORT' }),
      operator: { ...operator, role: 'SUPPORT' },
    });

    await harness.navigateByUrl('/operators');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.textContent).toContain('Provider dashboard');
    expect(harness.routeNativeElement?.textContent).not.toContain('Invite operator');
  });

  it('does not expose audit investigation routes to non-Administrator sessions', async () => {
    const harness = await RouterTestingHarness.create();

    for (const role of ['SUPPORT', 'FINANCE', 'MODERATOR'] as const) {
      TestBed.inject(AdminAuthService).establishSession({
        token: adminJwt({ tokenKind: 'admin', role }),
        operator: { ...operator, role },
      });

      await harness.navigateByUrl('/audit-logs');

      expect(TestBed.inject(Router).url).toBe('/');
      expect(harness.routeNativeElement?.textContent).not.toContain('Audit investigation');
    }
  });

  it('serves the provider dashboard to Support sessions', async () => {
    const harness = await RouterTestingHarness.create();

    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'SUPPORT' }),
      operator: { ...operator, role: 'SUPPORT' },
    });
    await harness.navigateByUrl('/');
    flushDashboard();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Provider dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Pending providers');
  });

  it('renders the dashboard denial state for Finance and Moderator sessions', async () => {
    const harness = await RouterTestingHarness.create();

    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'FINANCE' }),
      operator: { ...operator, role: 'FINANCE' },
    });
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard unavailable for FINANCE');

    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'MODERATOR' }),
      operator: { ...operator, role: 'MODERATOR' },
    });
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Dashboard unavailable for MODERATOR',
    );
  });

  it('does not restore ordinary marketplace tokens as Backoffice sessions', async () => {
    localStorage.setItem('proxi.backoffice.test.adminToken', adminJwt({ tokenKind: 'user' }));
    localStorage.setItem('proxi.backoffice.test.adminToken.identity', JSON.stringify(operator));

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', LoginPage);

    expect(localStorage.getItem('proxi.backoffice.test.adminToken')).toBeNull();
  });

  it('moves keyboard focus to validation errors', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    submit(fixture);
    fixture.detectChanges();

    expect(document.activeElement?.textContent).toContain(
      'Enter a valid administrative email and password.',
    );
  });
});

function flushDashboard(): void {
  TestBed.inject(HttpTestingController)
    .expectOne('http://localhost:3000/admin/dashboard/providers')
    .flush({
      period: {
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        defaultDays: 30,
        maxDays: 90,
      },
      queue: { pending: 2 },
      decisions: { approve: 1, reject: 0, block: 0, unblock: 0, total: 1 },
      reviewDuration: { averageMs: 18_000_000, averageHours: 5, reviewedProviders: 1 },
      recentSensitiveActions: [],
    });
}

function submit(fixture: ComponentFixture<LoginPage>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
