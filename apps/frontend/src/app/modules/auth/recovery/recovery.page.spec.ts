import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { RecoveryPage, newPasswordError } from './recovery.page';

describe('RecoveryPage', () => {
  let fixture: ComponentFixture<RecoveryPage>;
  let element: HTMLElement;
  let http: HttpTestingController;

  function setup(route: { reset?: boolean; fragment?: string | null } = {}) {
    TestBed.configureTestingModule({
      imports: [RecoveryPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: route.reset ? { reset: true } : {}, fragment: route.fragment ?? null } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecoveryPage);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const field = () => element.querySelector<HTMLInputElement>('input[tgInput]')!;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type="submit"]');
  const errors = () => Array.from(element.querySelectorAll('.tg-field__error')).map((e) => e.textContent?.trim());
  const alert = () => element.querySelector('tg-alert');
  const links = () => Array.from(element.querySelectorAll('a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);

  function type(value: string) {
    field().value = value;
    field().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit() {
    submitButton()!.click();
    fixture.detectChanges();
  }

  describe('Recuperar acesso', () => {
    it('has the heading and a link back to Entrar', () => {
      setup();
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Recuperar acesso');
      expect(links()).toContain(['Voltar para entrar', '/authenticate/login']);
    });

    it('validates the e-mail on submit and focuses the field', () => {
      setup();
      expect(errors()).toEqual([]);
      submit();
      expect(errors()).toEqual(['Informe seu e-mail.']);
      expect(document.activeElement).toBe(field());
      type('ana@email');
      expect(errors()).toEqual(['Informe um e-mail válido, como nome@email.com.']);
    });

    it('sends the link and replaces the form with the confirmation', () => {
      setup();
      type(' ana@email.com ');
      submit();
      const request = http.expectOne(environment.url + '/auth/forget');
      expect(request.request.body).toEqual({ email: 'ana@email.com' });
      expect(submitButton()!.getAttribute('aria-busy')).toBe('true');

      request.flush({ message: 'ok' });
      fixture.detectChanges();
      expect(element.querySelector('form')).toBeNull();
      expect(alert()?.textContent).toContain('Confira seu e-mail');
      expect(alert()?.textContent).toContain('Se houver uma conta com ana@email.com');
      expect(links().filter(([text]) => text === 'Voltar para entrar').length).toBe(2);
    });

    it('ignores a second submit while sending', () => {
      setup();
      type('ana@email.com');
      submit();
      submit();
      const requests = http.match(environment.url + '/auth/forget');
      expect(requests.length).toBe(1);
      requests[0].flush({ message: 'ok' });
    });

    it('keeps the form and shows the API error', () => {
      setup();
      type('ana@email.com');
      submit();
      http.expectOne(environment.url + '/auth/forget').flush({ message: 'Muitas tentativas' }, { status: 429, statusText: 'Too Many' });
      fixture.detectChanges();
      expect(element.querySelector('form')).not.toBeNull();
      expect(alert()?.textContent).toContain('Não foi possível enviar o link');
      expect(alert()?.textContent).toContain('Muitas tentativas');
    });
  });

  describe('Criar nova senha', () => {
    it('explains an invalid link when there is no token', () => {
      setup({ reset: true });
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Criar nova senha');
      expect(element.querySelector('form')).toBeNull();
      expect(alert()?.textContent).toContain('Link inválido ou vencido');
      expect(links()).toContain(['Pedir novo link', '/authenticate/forgot-password']);
    });

    it('validates the password length on submit', () => {
      setup({ reset: true, fragment: 'token=abc' });
      expect(element.querySelector('.tg-field__hint')?.textContent?.trim()).toBe('Pelo menos 10 caracteres.');
      submit();
      expect(errors()).toEqual(['Informe a nova senha.']);
      expect(document.activeElement).toBe(field());
      type('curta');
      expect(errors()).toEqual(['Use pelo menos 10 caracteres.']);
    });

    it('saves the new password with the token and offers Entrar', () => {
      setup({ reset: true, fragment: 'token=abc' });
      type('senha-nova-123');
      submit();
      const request = http.expectOne(environment.url + '/auth/reset-password');
      expect(request.request.body).toEqual({ token: 'abc', password: 'senha-nova-123' });
      request.flush({ message: 'ok' });
      fixture.detectChanges();
      expect(element.querySelector('form')).toBeNull();
      expect(alert()?.textContent).toContain('Senha atualizada');
      expect(links()).toContain(['Entrar', '/authenticate/login']);
    });

    it('shows the API error and keeps the form', () => {
      setup({ reset: true, fragment: 'token=abc' });
      type('senha-nova-123');
      submit();
      http
        .expectOne(environment.url + '/auth/reset-password')
        .flush({ message: 'Token expirado' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
      expect(element.querySelector('form')).not.toBeNull();
      expect(alert()?.textContent).toContain('Token expirado');
    });
  });
});

describe('newPasswordError', () => {
  it('follows the backend password rule (10 to 72 characters)', () => {
    expect(newPasswordError('a'.repeat(9))).toBe('Use pelo menos 10 caracteres.');
    expect(newPasswordError('a'.repeat(10))).toBe('');
    expect(newPasswordError('a'.repeat(72))).toBe('');
    expect(newPasswordError('a'.repeat(73))).toBe('Use no máximo 72 caracteres.');
  });
});
