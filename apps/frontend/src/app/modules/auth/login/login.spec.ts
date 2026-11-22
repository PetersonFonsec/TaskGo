import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Observable, of, Subject, throwError } from 'rxjs';
import { UserRegister } from '@shared/service/users/user-register';
import { Utils } from '@shared/service/utils/utils.service';
import { RolesBack } from '@shared/enums/roles.enum';
import { Login, emailError, loginErrorMessage } from './login';

describe('Login email destinations', () => {
  function setup(returnUrl: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl }) } },
        },
        {
          provide: UserRegister,
          useValue: { login: () => of({ user: { type: RolesBack.CUSTOMER } }) },
        },
        { provide: LiveAnnouncer, useValue: { announce: jasmine.createSpy() } },
      ],
    });
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const component = TestBed.runInInjectionContext(() => new Login());
    component.email.set('ana@email.com');
    component.password.set('segredo123');
    component.login();
    return navigate;
  }

  it('opens the evaluation after login', () => {
    expect(setup('/orders/42/review')).toHaveBeenCalledWith('/orders/42/review');
  });

  it('returns to a protected account route after login', () => {
    expect(setup('/general/42/history')).toHaveBeenCalledWith('/general/42/history');
  });

  for (const url of [
    'https://evil.example',
    '//evil.example',
    '/orders/42/unknown',
    '/authenticate/login',
    '/orders/42/../admin',
    '',
  ]) {
    it(`uses the normal home for an unsupported destination: ${url}`, () => {
      expect(setup(url)).toHaveBeenCalledWith(Utils.getRouteByRoleBack(RolesBack.CUSTOMER));
    });
  }
});

describe('Login screen', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  let login: jasmine.Spy<(payload: unknown) => Observable<unknown>>;
  let navigate: jasmine.Spy;

  function setup(response: () => Observable<unknown> = () => of({ user: { type: RolesBack.CUSTOMER } })) {
    login = jasmine.createSpy('login').and.callFake(response);
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: UserRegister, useValue: { login } },
        { provide: LiveAnnouncer, useValue: { announce: jasmine.createSpy() } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Login);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const errors = () => Array.from(element.querySelectorAll('.tg-field__error')).map((e) => e.textContent?.trim());

  function type(id: string, value: string) {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit() {
    submitButton().click();
    fixture.detectChanges();
  }

  it('has the "Entrar" heading, the forgot link and the "Criar conta" link', () => {
    setup();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Entrar');
    const hrefs = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/authenticate/forgot-password');
    expect(hrefs).toContain('/authenticate/register');
  });

  it('keeps "Entrar" enabled and shows no error before the first submit', () => {
    setup();
    expect(submitButton().disabled).toBeFalse();
    expect(errors()).toEqual([]);
  });

  it('shows each field error on submit and focuses the first invalid field', () => {
    setup();
    submit();
    expect(errors()).toEqual(['Informe seu e-mail.', 'Informe sua senha.']);
    expect(document.activeElement).toBe(input('login-email'));
    expect(input('login-email').getAttribute('aria-invalid')).toBe('true');
    expect(login).not.toHaveBeenCalled();
  });

  it('focuses the password when only the password is missing', () => {
    setup();
    type('login-email', 'ana@email.com');
    submit();
    expect(errors()).toEqual(['Informe sua senha.']);
    expect(document.activeElement).toBe(input('login-password'));
  });

  it('clears an error as soon as the field is fixed', () => {
    setup();
    submit();
    type('login-email', 'ana@email.com');
    expect(errors()).toEqual(['Informe sua senha.']);
  });

  it('sends the trimmed e-mail and the password', () => {
    setup();
    type('login-email', '  ana@email.com ');
    type('login-password', 'segredo123');
    submit();
    expect(login).toHaveBeenCalledOnceWith({ email: 'ana@email.com', password: 'segredo123' });
    expect(navigate).toHaveBeenCalledWith(Utils.getRouteByRoleBack(RolesBack.CUSTOMER));
  });

  it('shows loading while the request runs and ignores a second submit', () => {
    const pending = new Subject<unknown>();
    setup(() => pending);
    type('login-email', 'ana@email.com');
    type('login-password', 'segredo123');
    submit();
    submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');

    pending.error(new HttpErrorResponse({ status: 401, error: { message: 'Credenciais inválidas' } }));
    fixture.detectChanges();
    expect(submitButton().getAttribute('aria-busy')).not.toBe('true');
  });

  it('shows the API error in a danger alert', () => {
    setup(() => throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'Credenciais inválidas' } })));
    type('login-email', 'ana@email.com');
    type('login-password', 'errada');
    submit();
    const alert = element.querySelector('tg-alert');
    expect(alert?.textContent).toContain('Não foi possível entrar');
    expect(alert?.textContent).toContain('Credenciais inválidas');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('Login helpers', () => {
  it('validates the e-mail', () => {
    expect(emailError('')).toBe('Informe seu e-mail.');
    expect(emailError('ana@email')).toBe('Informe um e-mail válido, como nome@email.com.');
    expect(emailError(' ana@email.com ')).toBe('');
  });

  it('turns API failures into readable messages', () => {
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 400, error: { message: ['email inválido'] } }))).toBe('email inválido');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 500, error: null }))).toContain('Não foi possível entrar');
  });
});
