import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { AdminOperatorProfile } from '@taskgo/shared';

import { AdminShellComponent } from './admin-shell.component';

const supportOperator: AdminOperatorProfile = {
  id: '43',
  name: 'Support Operator',
  email: 'support@example.com',
  role: 'SUPPORT',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  let auth: jasmine.SpyObj<AdminAuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AdminAuthService>('AdminAuthService', ['logout'], {
      operator: signal(supportOperator)
    });

    TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [provideRouter([]), { provide: AdminAuthService, useValue: auth }]
    });

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders navigation allowed for the current fixed role', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Dashboard');
    expect(text).toContain('Providers');
    expect(text).not.toContain('Audit log');
    expect(text).not.toContain('Operators');
  });

  it('delegates logout from the shell action', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();

    expect(auth.logout).toHaveBeenCalled();
  });

  it('renders no navigation while the operator is unavailable', () => {
    auth = jasmine.createSpyObj<AdminAuthService>('AdminAuthService', ['logout'], {
      operator: signal(null)
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [provideRouter([]), { provide: AdminAuthService, useValue: auth }]
    });

    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('nav a').length).toBe(0);
  });
});
