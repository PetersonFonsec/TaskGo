import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { PublicUserProfile } from '@taskgo/shared';

import { environment } from '@environments/environment';
import { GeneralRoutes } from '@modules/general/general.routes';
import { sessionUserGuard } from '@shared/guards/session-user/session-user.guard';
import { unauthorizedGuard } from '@shared/guards/unauthorized/unauthorized.guard';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { PROFILE_SAVED_STATE } from '../personal-data';
import { ProfileView } from './profile-view';

@Component({ template: '' })
class BlankPage {}

const URL = environment.url + '/user/42';

const CUSTOMER: PublicUserProfile = {
  id: '42',
  name: 'Ana Souza',
  email: 'ana@email.com',
  phone: '11912345678',
  cpf: '12345678909',
  type: 'CLIENTE',
  photoUrl: '',
  emailVerified: true,
  phoneVerified: false,
  addresses: [
    { id: '1', label: 'Casa', street: 'Rua Exemplo', number: '10', city: 'São Paulo', state: 'SP', isPrimary: true },
  ],
};

describe('ProfileView (Dados pessoais)', () => {
  const session = signal<unknown>({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza' } });
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;
  const token = { token: 'abc', clearToken: jasmine.createSpy('clearToken') };

  beforeEach(async () => {
    session.set({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza' } });
    token.clearToken.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'general/:userId/profile/view', component: ProfileView },
          { path: '**', component: BlankPage },
        ]),
        { provide: UserLoggedService, useValue: { user: session } },
        { provide: TokenService, useValue: token },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = () => (el().textContent ?? '').replace(/\s+/g, ' ');
  async function open(state?: Record<string, unknown>) {
    await router.navigateByUrl('/general/42/profile/view', state ? { state } : {});
    harness.detectChanges();
    await harness.fixture.whenStable();
  }
  async function respond(body: PublicUserProfile | 'error' | 401) {
    const request = http.expectOne(URL);
    if (body === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
    else if (body === 401) request.flush('erro', { status: 401, statusText: 'Unauthorized' });
    else request.flush(body);
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  it('fica numa rota própria do shell, com login e o id da sessão', () => {
    const route = GeneralRoutes.find((r) => r.path === ':userId/profile');
    expect(route?.canActivate).toEqual([unauthorizedGuard, sessionUserGuard]);
    expect(route?.children?.map((child) => child.path)).toEqual(['view', 'edit', '']);
    const container = GeneralRoutes.find((r) => r.path === ':userId');
    expect(container?.children?.some((child) => child.path === 'profile')).toBeFalse();
  });

  it('mostra o skeleton enquanto carrega e um h1 só', async () => {
    await open();
    const view = harness.routeDebugElement!.componentInstance as ProfileView;
    expect(view.loading()).toBeTrue();
    expect(el().querySelectorAll('h1').length).toBe(1);
    expect(el().querySelector('[data-cy="edit-profile"]')).toBeNull();
    await respond(CUSTOMER);
    expect(view.loading()).toBeFalse();
  });

  it('mostra os dados do cliente, com a verificação e o telefone formatado', async () => {
    await open();
    await respond(CUSTOMER);
    expect(el().querySelector('h1')?.textContent).toContain('Dados pessoais');
    expect(el().querySelector('[data-cy="profile-name"]')?.textContent).toContain('Ana Souza');
    expect(el().querySelector('[data-cy="profile-email"]')?.textContent).toContain('ana@email.com');
    expect(el().querySelector('[data-cy="profile-phone"]')?.textContent).toContain('(11) 91234-5678');
    expect(text()).toContain('Cliente');
    expect(text()).toContain('Verificado');
    expect(text()).toContain('Não verificado');
    expect(text()).toContain('Rua Exemplo, 10');
    expect(el().querySelector('a[href="/customer/favorites"]')).toBeTruthy();
    expect(el().querySelector('a[href="/provider/services"]')).toBeNull();
    expect(text()).not.toContain('Ver meu perfil público');
    expect(el().querySelector('[data-cy="edit-profile"]')?.getAttribute('href')).toBe('/general/42/profile/edit');
  });

  it('mostra o progresso do cadastro com a ação do que falta', async () => {
    await open();
    await respond(CUSTOMER);
    expect(text()).toContain('Complete seu cadastro');
    expect(text()).toContain('67%');
    expect(text()).toContain('2 de 3 etapas concluídas');
    expect(text()).toContain('Adicionar foto');
  });

  it('mostra os atalhos e o perfil público para o prestador, nos dois formatos de papel', async () => {
    for (const type of ['PRESTADOR', 'PROVIDER'] as const) {
      await open();
      await respond({ ...CUSTOMER, type });
      expect(text()).withContext(type).toContain('Profissional');
      expect(el().querySelector('a[href="/provider/services"]')).withContext(type).toBeTruthy();
      expect(el().querySelector('a[href="/provider/recebimentos"]')).withContext(type).toBeTruthy();
      expect(el().querySelector('a[href="/provider/profile/42"]')).withContext(type).toBeTruthy();
      expect(el().querySelector('a[href="/customer/favorites"]')).withContext(type).toBeNull();
      await router.navigateByUrl('/fora');
    }
  });

  it('cadastro completo e sem endereço', async () => {
    await open();
    await respond({ ...CUSTOMER, photoUrl: 'https://example.com/a.jpg' });
    expect(text()).toContain('Cadastro completo');
    expect(el().querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.jpg');

    await router.navigateByUrl('/fora');
    await open();
    await respond({ ...CUSTOMER, addresses: [], phone: '', emailVerified: undefined, phoneVerified: undefined });
    expect(text()).toContain('Nenhum endereço cadastrado');
    expect(text()).toContain('Não informado');
    expect(text()).not.toContain('Verificado');
  });

  it('prefere o endereço principal', async () => {
    await open();
    const first = CUSTOMER.addresses![0];
    await respond({ ...CUSTOMER, addresses: [{ ...first, isPrimary: false }, { ...first, street: 'Principal', isDefault: true }] });
    expect(text()).toContain('Endereço principal');
    expect(text()).toContain('Principal');
  });

  it('usa o id da sessão, nunca o da URL', async () => {
    await router.navigateByUrl('/general/99/profile/view');
    harness.detectChanges();
    await harness.fixture.whenStable();
    http.expectNone(environment.url + '/user/99');
    await respond(CUSTOMER);
    expect(text()).toContain('Ana Souza');
  });

  it('mostra o erro com "Tentar de novo", que recarrega', async () => {
    await open();
    await respond('error');
    expect(text()).toContain('Não foi possível carregar seus dados');
    expect(el().querySelector('[role="alert"]')).toBeTruthy();
    const retry = [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Tentar de novo'))!;
    retry.click();
    harness.detectChanges();
    await respond(CUSTOMER);
    expect(text()).toContain('Ana Souza');
  });

  it('sessão vencida pede para entrar de novo', async () => {
    await open();
    await respond(401);
    expect(text()).toContain('Sua sessão expirou');
    const button = [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Entrar de novo'))!;
    button.click();
    await harness.fixture.whenStable();
    expect(token.clearToken).toHaveBeenCalled();
    expect(router.url).toBe('/authenticate/login');
  });

  it('sem id na sessão, mostra o erro sem consultar', async () => {
    session.set({});
    await open();
    http.expectNone(() => true);
    expect(text()).toContain('Não encontramos sua conta');
  });

  it('confirma quando vem da edição com os dados salvos', async () => {
    await open({ [PROFILE_SAVED_STATE]: true });
    await respond(CUSTOMER);
    expect(text()).toContain('Dados salvos.');
    await router.navigateByUrl('/fora');
    await open();
    await respond(CUSTOMER);
    expect(text()).not.toContain('Dados salvos.');
  });

  describe('confirmação de salvamento', () => {
    const page = () => harness.routeDebugElement!.componentInstance as ProfileView;
    const savedAlert = () =>
      [...el().querySelectorAll('tg-alert')].find((alert) => alert.textContent?.includes('Dados salvos.'));

    it('aparece quando o PATCH deu certo e o GET também', async () => {
      await open({ [PROFILE_SAVED_STATE]: true });
      expect(savedAlert()).toBeUndefined(); // ainda carregando
      await respond(CUSTOMER);
      expect(savedAlert()).toBeTruthy();
      expect(text()).toContain('Ana Souza');
    });

    it('não aparece junto com a falha do GET (500); volta quando os dados carregam', async () => {
      await open({ [PROFILE_SAVED_STATE]: true });
      await respond('error');
      expect(text()).toContain('Não foi possível carregar seus dados');
      expect(savedAlert()).toBeUndefined();

      [...el().querySelectorAll('button')].find((b) => b.textContent?.includes('Tentar de novo'))!.click();
      harness.detectChanges();
      await respond(CUSTOMER);
      expect(savedAlert()).toBeTruthy();
    });

    it('não aparece com a sessão vencida (401)', async () => {
      await open({ [PROFILE_SAVED_STATE]: true });
      await respond(401);
      expect(text()).toContain('Sua sessão expirou');
      expect(text()).toContain('Entrar de novo');
      expect(savedAlert()).toBeUndefined();
    });

    it('não aparece numa navegação comum', async () => {
      await open();
      await respond(CUSTOMER);
      expect(savedAlert()).toBeUndefined();
    });

    it('fechada, some e não volta ao recarregar a tela', async () => {
      await open({ [PROFILE_SAVED_STATE]: true });
      await respond(CUSTOMER);
      savedAlert()!.querySelector<HTMLButtonElement>('.tg-alert__close')!.click();
      harness.detectChanges();
      await harness.fixture.whenStable();
      expect(page().saved()).toBeFalse();
      expect(savedAlert()).toBeUndefined();

      page().reload();
      await respond(CUSTOMER);
      expect(savedAlert()).toBeUndefined();
    });

    it('não passa para outra conta que entre na sessão', async () => {
      await open({ [PROFILE_SAVED_STATE]: true });
      await respond(CUSTOMER);
      expect(savedAlert()).toBeTruthy();

      session.set({ user: { id: '43', type: 'CLIENTE', name: 'Bruno Lima' } });
      harness.detectChanges();
      await harness.fixture.whenStable();
      const request = http.expectOne(environment.url + '/user/43');
      request.flush({ ...CUSTOMER, id: '43', name: 'Bruno Lima' });
      harness.detectChanges();
      await harness.fixture.whenStable();
      expect(text()).toContain('Bruno Lima');
      expect(savedAlert()).toBeUndefined();
    });
  });
});
