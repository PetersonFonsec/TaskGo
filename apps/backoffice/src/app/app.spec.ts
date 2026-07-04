import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AdminAuthService } from './core/auth/admin-auth.service';
import { AdminOperator } from './core/auth/admin-session.model';
import { adminJwt } from './core/auth/admin-auth.service.spec';
import { BACKOFFICE_ENVIRONMENT } from './core/config/backoffice-environment.token';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { LoginPage } from './features/login/login.page';
import { NotFoundPage } from './features/not-found/not-found.page';
import { App } from './app';
import { routes } from './app.routes';
import { environment as developmentEnvironment } from '../environments/environment.development';
import { environment as productionEnvironment } from '../environments/environment';

const operator: AdminOperator = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z',
};

describe('Backoffice application bootstrap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('creates the root application with the production environment', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: productionEnvironment },
      ],
    });

    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
    expect(productionEnvironment.production).toBeTrue();
    expect(productionEnvironment.apiUrl).toBe('/admin');
    expect(productionEnvironment.adminTokenStorageKey).toBe('proxi.backoffice.adminToken');
  });

  it('provides the production environment by default', () => {
    const providedEnvironment = TestBed.inject(BACKOFFICE_ENVIRONMENT);

    expect(providedEnvironment).toEqual(productionEnvironment);
  });

  it('renders the provider dashboard with the development environment', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: developmentEnvironment },
      ],
    });

    const harness = await RouterTestingHarness.create();
    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' }),
      operator,
    });
    await harness.navigateByUrl('/');
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/admin/dashboard/providers')
      .flush(emptyDashboard());
    harness.detectChanges();
    const page = harness.routeNativeElement;

    expect(developmentEnvironment.production).toBeFalse();
    expect(page?.textContent).toContain('Provider dashboard');
    expect(page?.textContent).toContain('Pending providers');
  });

  it('resolves unknown routes to the Backoffice not-found state', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: productionEnvironment },
      ],
    });

    const harness = await RouterTestingHarness.create();
    TestBed.inject(AdminAuthService).establishSession({
      token: adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' }),
      operator,
    });
    await harness.navigateByUrl('/customer/search');
    const page = document.body;

    expect(page.textContent).toContain('Page not found');
    expect(page.textContent).toContain('requested administrative route is not available');
  });

  it('renders login for anonymous operators', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKOFFICE_ENVIRONMENT, useValue: productionEnvironment },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', LoginPage);

    expect(harness.routeNativeElement?.textContent).toContain('Sign in to Proxi Backoffice');
  });
});

function emptyDashboard() {
  return {
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
  };
}
