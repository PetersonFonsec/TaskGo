import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { PublicUserProfile } from '@taskgo/shared';

import { environment } from '@environments/environment';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { PROFILE_SAVED_STATE } from '../personal-data';
import { ProfileEdit } from './profile-edit';

@Component({ template: '' })
class BlankPage {}

const URL = environment.url + '/user/42';

const PROFILE: PublicUserProfile = {
  id: '42',
  name: 'Ana Souza',
  email: 'ana@email.com',
  phone: '11912345678',
  cpf: '12345678909',
  type: 'CLIENTE',
  photoUrl: null,
  emailVerified: true,
  phoneVerified: true,
  addresses: [],
};

describe('ProfileEdit (Editar dados pessoais)', () => {
  let session: ReturnType<typeof signal<unknown>>;
  let setUserLogged: jasmine.Spy;
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    session = signal<unknown>({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza', photoUrl: '' }, providerHome: undefined });
    setUserLogged = jasmine.createSpy('setUserLogged').and.callFake((value: unknown) => session.set(value));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'general/:userId/profile/edit', component: ProfileEdit },
          { path: '**', component: BlankPage },
        ]),
        { provide: UserLoggedService, useValue: { user: session, setUserLogged } },
        { provide: TokenService, useValue: { token: 'abc', clearToken: () => undefined } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await router.navigateByUrl('/general/42/profile/edit');
    harness.detectChanges();
    await harness.fixture.whenStable();
  });

  afterEach(() => http.verify());

  const el = () => harness.routeNativeElement as HTMLElement;
  const page = () => harness.routeDebugElement!.componentInstance as ProfileEdit;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  const input = (id: string) => el().querySelector<HTMLInputElement>('#' + id)!;
  const render = async () => {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  };
  async function load(body: PublicUserProfile | 'error' = PROFILE) {
    const request = http.expectOne((r) => r.method === 'GET' && r.url === URL);
    if (body === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
    else request.flush(body);
    await render();
  }
  async function type(id: string, value: string) {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await render();
  }
  async function submit() {
    el().querySelector<HTMLButtonElement>('[data-cy="save-profile"]')!.click();
    await render();
  }

  it('preenche o formulário com os dados atuais, o telefone formatado', async () => {
    expect(page().loading()).toBeTrue();
    await load();
    expect(el().querySelector('h1')?.textContent).toContain('Editar dados pessoais');
    expect(input('name-input').value).toBe('Ana Souza');
    expect(input('email-input').value).toBe('ana@email.com');
    expect(input('phone-input').value).toBe('(11) 91234-5678');
    expect(input('photo-url-input').value).toBe('');
    expect(text()).toContain('Ao trocar, o novo e-mail precisa ser verificado.');
  });

  it('mostra os erros ao salvar, foca o primeiro inválido e não chama a API', async () => {
    await load();
    expect(text()).not.toContain('Informe seu nome.');
    await type('name-input', '  ');
    await type('email-input', 'bad-email');
    await type('phone-input', '12345678');
    await submit();
    expect(text()).toContain('Informe seu nome.');
    expect(text()).toContain('Informe um e-mail válido');
    expect(text()).toContain('Informe o telefone com DDD, como (11) 91234-5678.');
    expect(document.activeElement).toBe(input('name-input'));
    expect(input('email-input').getAttribute('aria-invalid')).toBe('true');
    http.expectNone((r) => r.method === 'PATCH');

    await type('name-input', 'Ana');
    expect(text()).not.toContain('Informe seu nome.');
  });

  it('recusa foto que não é HTTPS', async () => {
    await load();
    await type('photo-url-input', 'javascript:alert(1)');
    await submit();
    expect(text()).toContain('Use um link que comece com https://.');
    expect(document.activeElement).toBe(input('photo-url-input'));
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('não chama a API quando nada mudou', async () => {
    await load();
    await submit();
    expect(text()).toContain('Nada mudou');
    http.expectNone((r) => r.method === 'PATCH');
  });

  // Regressão: antes a tela mandava nome, e-mail, telefone e foto em todo
  // salvamento, e a API desfazia a verificação do e-mail e do telefone.
  it('manda só o que mudou, mostra o carregando e volta com a confirmação', async () => {
    await load();
    await type('name-input', ' Ana Clara Souza ');
    await type('photo-url-input', 'https://example.com/ana.jpg');
    await submit();

    const request = http.expectOne((r) => r.method === 'PATCH' && r.url === URL);
    expect(request.request.body).toEqual({ name: 'Ana Clara Souza', photoUrl: 'https://example.com/ana.jpg' });
    expect(page().saving()).toBeTrue();
    expect(el().querySelector('[data-cy="save-profile"]')?.getAttribute('aria-busy')).toBe('true');

    // Um envio por vez.
    page().save();
    http.expectNone((r) => r.method === 'PATCH');

    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    request.flush({ ...PROFILE, name: 'Ana Clara Souza', photoUrl: 'https://example.com/ana.jpg' });
    await render();
    expect(navigate).toHaveBeenCalledWith(['/general', '42', 'profile', 'view'], { state: { [PROFILE_SAVED_STATE]: true } });
    expect(setUserLogged).toHaveBeenCalledWith(
      jasmine.objectContaining({
        user: jasmine.objectContaining({ id: '42', name: 'Ana Clara Souza', photoUrl: 'https://example.com/ana.jpg' }),
      }),
    );
  });

  it('manda o telefone só com dígitos, como a API guarda', async () => {
    await load();
    await type('phone-input', '(21) 3456-7890');
    await submit();
    const request = http.expectOne((r) => r.method === 'PATCH');
    expect(request.request.body).toEqual({ phone: '2134567890' });
    request.flush({ ...PROFILE, phone: '2134567890' });
    await render();
  });

  it('remove a foto mandando null', async () => {
    await load({ ...PROFILE, photoUrl: 'https://example.com/a.jpg' });
    expect(el().querySelector('.avatar img')?.getAttribute('src')).toBe('https://example.com/a.jpg');
    await type('photo-url-input', '');
    await submit();
    const request = http.expectOne((r) => r.method === 'PATCH');
    expect(request.request.body).toEqual({ photoUrl: null });
    request.flush({ ...PROFILE, photoUrl: null });
    await render();
  });

  it('mostra o erro ao salvar, mantém o que foi digitado e solta o botão', async () => {
    await load();
    await type('email-input', 'nova@email.com');
    await submit();
    http.expectOne((r) => r.method === 'PATCH').flush('erro', { status: 400, statusText: 'Bad Request' });
    await render();
    expect(text()).toContain('Não deu para salvar');
    expect(text()).toContain('Confira o e-mail e o telefone');
    expect(el().querySelector('[role="alert"]')).toBeTruthy();
    expect(input('email-input').value).toBe('nova@email.com');
    expect(page().saving()).toBeFalse();
    expect(setUserLogged).not.toHaveBeenCalled();
  });

  it('falha ao carregar mostra "Tentar de novo"', async () => {
    await load('error');
    expect(text()).toContain('Não foi possível carregar seus dados');
    expect(el().querySelector('form')).toBeNull();
    [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Tentar de novo'))!.click();
    await render();
    await load();
    expect(el().querySelector('form')).toBeTruthy();
  });

  it('"Cancelar" e "Voltar" levam aos dados pessoais', async () => {
    await load();
    const links = [...el().querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links.filter((href) => href === '/general/42/profile/view').length).toBe(2);
  });
});
