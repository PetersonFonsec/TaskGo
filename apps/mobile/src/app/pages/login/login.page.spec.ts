import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { AuthService, ProviderAccountError } from '@app/core/auth/auth.service';
import { PushRegistrationService } from '@app/core/push/push-registration.service';
import { LoginPage, loginErrorMessage, safeReturnUrl } from './login.page';

describe('LoginPage helpers', () => {
  it('explains each login failure in plain words', () => {
    expect(loginErrorMessage(new ProviderAccountError())).toContain('Prestadores usam o TaskGo pelo site');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 401 }))).toBe('E-mail ou senha incorretos.');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão');
    expect(loginErrorMessage(new Error('x'))).toContain('Tente de novo');
  });

  it('only returns to internal pages after login', () => {
    expect(safeReturnUrl('/categorias/eletrica')).toBe('/categorias/eletrica');
    expect(safeReturnUrl('//evil.com')).toBe('/');
    expect(safeReturnUrl('https://evil.com')).toBe('/');
    expect(safeReturnUrl(undefined)).toBe('/');
  });
});

describe('LoginPage', () => {
  let auth: { login: jasmine.Spy };
  let push: { enable: jasmine.Spy };
  let navigate: jasmine.Spy;

  function render() {
    auth = { login: jasmine.createSpy('login').and.resolveTo({}) };
    push = { enable: jasmine.createSpy('enable').and.resolveTo('registering') };
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PushRegistrationService, useValue: push }
      ]
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  }

  it('does not call the API with an invalid form', async () => {
    const page = render().componentInstance;
    await page.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in, turns on push and goes back to the requested page', async () => {
    const fixture = render();
    fixture.componentRef.setInput('voltar', '/categorias/eletrica');
    const page = fixture.componentInstance;
    page.form.setValue({ email: ' ana@example.com ', password: 'secret' });
    await page.submit();

    expect(auth.login).toHaveBeenCalledWith('ana@example.com', 'secret');
    expect(push.enable).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/categorias/eletrica', { replaceUrl: true });
  });

  it('shows the error and stays on the page when login fails', async () => {
    const fixture = render();
    auth.login.and.rejectWith(new HttpErrorResponse({ status: 401 }));
    fixture.componentInstance.form.setValue({ email: 'ana@example.com', password: 'wrong' });
    await fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('E-mail ou senha incorretos.');
    expect(push.enable).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
