import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import type { AdminOperatorProfile } from '@taskgo/shared';

import { LoginPage } from './login.page';

const operator: AdminOperatorProfile = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let auth: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AdminAuthService>('AdminAuthService', ['login']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AdminAuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/providers' }) } }
        }
      ]
    });

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('navigates to the requested return URL after login', () => {
    auth.login.and.returnValue(of({ token: 'token', operator }));

    fillAndSubmit(fixture);

    expect(auth.login).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'admin-password'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/providers');
  });

  it('focuses the API error after rejected credentials', () => {
    auth.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }))
    );

    fillAndSubmit(fixture);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Administrative credentials were not accepted.'
    );
    expect(document.activeElement?.textContent).toContain(
      'Administrative credentials were not accepted.'
    );
  });
});

function fillAndSubmit(fixture: ComponentFixture<LoginPage>): void {
  const email = fixture.nativeElement.querySelector('#admin-email') as HTMLInputElement;
  const password = fixture.nativeElement.querySelector('#admin-password') as HTMLInputElement;
  email.value = 'admin@example.com';
  email.dispatchEvent(new Event('input'));
  password.value = 'admin-password';
  password.dispatchEvent(new Event('input'));
  fixture.detectChanges();

  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
