import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { GeneralRoutes } from '../../general.routes';
import { accountInitials, accountLinks, Home } from './home';

const PROFILE = {
  id: 'user-1',
  name: 'Ana Clara Souza',
  email: 'ana@email.com',
  phone: '11999990000',
  cpf: '12345678901',
  type: 'CLIENTE',
  photoUrl: null,
};

describe('Home (Conta)', () => {
  let fixture: ComponentFixture<Home>;
  let el: HTMLElement;
  let http: HttpTestingController | undefined;
  let session: WritableSignal<unknown>;
  const logout = jasmine.createSpy('logout');
  const token = { clearToken: jasmine.createSpy('clearToken'), token: 'abc' };

  async function setup(user: unknown) {
    session.set(user);
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserLoggedService, useValue: { user: session, logout } },
        { provide: TokenService, useValue: token },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const profileRequest = () =>
    http!.expectOne((req) => req.method === 'GET' && req.url.endsWith('/user/user-1'));
  const labels = () =>
    Array.from(el.querySelectorAll('.account__label')).map((n) => n.textContent?.trim());
  const hrefs = () =>
    Array.from(el.querySelectorAll<HTMLAnchorElement>('a.account__item')).map((a) =>
      a.getAttribute('href'),
    );
  const button = (text: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  beforeEach(() => {
    // Testes sem setup (funções puras) não criam o TestBed; sem isso, o
    // afterEach usaria o controller de outro teste ou quebraria com a ordem
    // aleatória do Jasmine.
    http = undefined;
    session = signal<unknown>(undefined);
    logout.calls.reset();
    token.clearToken.calls.reset();
  });

  afterEach(() => http?.verify());

  it('cliente: um h1 "Conta", os dados da sessão vindos da API e os links da conta', async () => {
    await setup({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
    profileRequest().flush(PROFILE);
    await render();

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Conta');
    expect(el.querySelector('.account__name')?.textContent?.trim()).toBe('Ana Clara Souza');
    expect(el.querySelector('.account__email')?.textContent?.trim()).toBe('ana@email.com');
    expect(el.querySelector('.account__avatar')?.textContent?.trim()).toBe('AS');
    expect(el.querySelector('tg-badge')?.textContent?.trim()).toBe('Cliente');
    expect(labels()).toEqual(['Dados pessoais', 'Endereços', 'Pedidos', 'Ajuda']);
    expect(hrefs()).toEqual([
      '/general/user-1/profile',
      '/general/user-1/addresses',
      '/general/user-1/history',
      'mailto:suporte@proxi.com.br',
    ]);
    expect(el.querySelector('nav[aria-label="Sua conta"]')).not.toBeNull();
  });

  it('prestador: "Profissional" e o link para a prévia do perfil público', async () => {
    await setup({ user: { id: 'user-1', type: 'PRESTADOR', name: 'Bruno' } });
    profileRequest().flush({
      ...PROFILE,
      type: 'PRESTADOR',
      photoUrl: 'https://cdn.example/foto.jpg',
    });
    await render();

    expect(el.querySelector('tg-badge')?.textContent?.trim()).toBe('Profissional');
    expect(labels()).toEqual(['Dados pessoais', 'Endereços', 'Pedidos', 'Ajuda', 'Perfil público']);
    expect(hrefs()[3]).toBe('mailto:suporte@proxi.com.br');
    expect(hrefs()[4]).toBe('/provider/profile/user-1');
    const photo = el.querySelector<HTMLImageElement>('.account__avatar img');
    expect(photo?.getAttribute('src')).toBe('https://cdn.example/foto.jpg');
    expect(photo?.getAttribute('alt')).toBe('');
  });

  it('carregando: região ocupada, sem dados nem alerta, e os links já à vista', async () => {
    await setup({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
    const req = profileRequest();
    await render();

    expect(el.querySelector('.tg-loading__body')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.account__name')).toBeNull();
    expect(el.querySelector('tg-alert')).toBeNull();
    expect(labels()).toEqual(['Dados pessoais', 'Endereços', 'Pedidos', 'Ajuda']);
    req.flush(PROFILE);
  });

  it('erro: alerta com "Tentar de novo", que repete a consulta; os links continuam', async () => {
    await setup({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
    profileRequest().flush('falhou', { status: 500, statusText: 'Server Error' });
    await render();

    const alert = el.querySelector('tg-alert');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('Não foi possível carregar seus dados');
    expect(labels()).toEqual(['Dados pessoais', 'Endereços', 'Pedidos', 'Ajuda']);

    button('Tentar de novo')!.click();
    profileRequest().flush(PROFILE);
    await render();
    expect(el.querySelector('tg-alert')).toBeNull();
    expect(el.querySelector('.account__name')?.textContent?.trim()).toBe('Ana Clara Souza');
  });

  it('401: "Sua sessão expirou" e "Entrar novamente" limpa o token e vai para o login', async () => {
    await setup({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
    profileRequest().flush('expirou', { status: 401, statusText: 'Unauthorized' });
    await render();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    expect(el.querySelector('tg-alert')?.textContent).toContain('Sua sessão expirou');
    expect(button('Tentar de novo')).toBeUndefined();
    button('Entrar novamente')!.click();
    expect(token.clearToken).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/authenticate/login');
  });

  it('sessão sem id: não consulta a API, pede para entrar de novo e não monta links', async () => {
    await setup({});
    await render();

    http!.expectNone(() => true);
    expect(el.querySelector('tg-alert')?.textContent).toContain('Sua sessão expirou');
    expect(el.querySelectorAll('a.account__item').length).toBe(0);
    expect(button('Sair da conta')).toBeDefined();
  });

  it('"Sair da conta" encerra a sessão', async () => {
    await setup({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
    profileRequest().flush(PROFILE);
    await render();

    button('Sair da conta')!.click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('accountLinks e accountInitials', () => {
    expect(accountLinks('9', 'customer').map((l) => l.label)).toEqual([
      'Dados pessoais',
      'Endereços',
      'Pedidos',
      'Ajuda',
    ]);
    expect(accountLinks('9', 'provider').at(-1)?.link).toEqual(['/provider/profile', '9']);
    expect(accountInitials('Bruno')).toBe('BR');
    expect(accountInitials('  ana maria lima ')).toBe('AL');
    expect(accountInitials('')).toBe('');
  });
});

describe('Rotas da Conta', () => {
  const session = signal<unknown>({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'general', children: GeneralRoutes }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserLoggedService, useValue: { user: session, logout: () => undefined } },
        { provide: TokenService, useValue: { token: 'abc', clearToken: () => undefined } },
      ],
    });
  });

  it('/general/:id leva à Conta e o id da URL é trocado pelo da sessão', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/general/outro');
    expect(TestBed.inject(Router).url).toBe('/general/user-1/home');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Conta');
    TestBed.inject(HttpTestingController).match(() => true);
  });
});
