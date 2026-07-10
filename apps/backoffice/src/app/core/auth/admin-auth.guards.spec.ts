import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';

import { AdminAuthService } from './admin-auth.service';
import {
  requireAdminRoleGuard,
  requireAdminSessionGuard,
  requireAnonymousAdminGuard
} from './admin-auth.guards';
import type { AdminOperatorProfile } from '@taskgo/shared';

const adminOperator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('admin auth guards', () => {
  let auth: jasmine.SpyObj<AdminAuthService>;
  let isAuthenticated: WritableSignal<boolean>;
  let operator: WritableSignal<AdminOperatorProfile | null>;
  let router: Router;

  beforeEach(() => {
    isAuthenticated = signal(false);
    operator = signal(null);
    auth = jasmine.createSpyObj<AdminAuthService>('AdminAuthService', [], {
      isAuthenticated,
      operator
    });

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AdminAuthService, useValue: auth }]
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('allows protected routes when an admin session exists', () => {
    setAuthenticated(true);

    const result = TestBed.runInInjectionContext(() =>
      requireAdminSessionGuard({} as ActivatedRouteSnapshot, { url: '/providers' } as RouterStateSnapshot)
    );

    expect(result).toBeTrue();
  });

  it('redirects anonymous protected routes with return URL', () => {
    const result = TestBed.runInInjectionContext(() =>
      requireAdminSessionGuard({} as ActivatedRouteSnapshot, { url: '/providers' } as RouterStateSnapshot)
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/login?returnUrl=%2Fproviders'
    );
  });

  it('allows login for anonymous operators and redirects authenticated operators away', () => {
    const anonymous = TestBed.runInInjectionContext(() =>
      requireAnonymousAdminGuard(
        { queryParamMap: { get: () => null } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )
    );
    expect(anonymous).toBeTrue();

    setAuthenticated(true);
    const authenticated = TestBed.runInInjectionContext(() =>
      requireAnonymousAdminGuard(
        { queryParamMap: { get: () => '/providers' } } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )
    );

    expect(router.serializeUrl(authenticated as ReturnType<Router['createUrlTree']>)).toBe(
      '/providers'
    );
  });

  it('allows routes only for the configured fixed role', () => {
    operator.set(adminOperator);

    const allowed = TestBed.runInInjectionContext(() =>
      requireAdminRoleGuard(['ADMINISTRATOR'])(
        {} as ActivatedRouteSnapshot,
        { url: '/operators' } as RouterStateSnapshot
      )
    );
    expect(allowed).toBeTrue();

    operator.set({ ...adminOperator, role: 'SUPPORT' });
    const denied = TestBed.runInInjectionContext(() =>
      requireAdminRoleGuard(['ADMINISTRATOR'])(
        {} as ActivatedRouteSnapshot,
        { url: '/operators' } as RouterStateSnapshot
      )
    );
    expect(router.serializeUrl(denied as ReturnType<Router['createUrlTree']>)).toBe('/');
  });

  function setAuthenticated(value: boolean): void {
    isAuthenticated.set(value);
  }
});
