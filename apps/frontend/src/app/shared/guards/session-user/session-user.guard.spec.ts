import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { GeneralRoutes } from '@modules/general/general.routes';
import { unauthorizedGuard } from '../unauthorized/unauthorized.guard';
import { sessionUserGuard, sessionUserId } from './session-user.guard';

@Component({ template: '' })
class PageComponent {}

describe('sessionUserGuard', () => {
  const session = signal<unknown>(null);
  const token = { token: '' };

  async function go(url: string) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'authenticate/login', component: PageComponent },
          {
            path: 'general/:userId/history',
            canActivate: [unauthorizedGuard, sessionUserGuard],
            component: PageComponent,
          },
        ]),
        { provide: TokenService, useValue: token },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return router.url;
  }

  beforeEach(() => {
    token.token = 'token';
    session.set({ user: { id: '42', type: 'CLIENTE' } });
  });

  it('cliente logado acessa os próprios pedidos', async () => {
    expect(await go('/general/42/history')).toBe('/general/42/history');
  });

  it('prestador logado acessa os próprios pedidos', async () => {
    session.set({ user: { id: 77, type: 'PRESTADOR' } });
    expect(await go('/general/77/history?aba=agendados')).toBe('/general/77/history?aba=agendados');
  });

  it('sem login vai para o login, com a volta para a tela', async () => {
    token.token = '';
    expect(await go('/general/42/history')).toBe('/authenticate/login?returnUrl=%2Fgeneral%2F42%2Fhistory');
  });

  it('id da URL diferente do da sessão: troca pelo da sessão e mantém a aba', async () => {
    expect(await go('/general/99/history?aba=concluidos')).toBe('/general/42/history?aba=concluidos');
  });

  it('o redirecionamento termina na segunda passada (sem laço)', async () => {
    const url = await go('/general/99/history');
    const router = TestBed.inject(Router);
    const navigations: string[] = [];
    router.events.subscribe((event) => {
      if ('urlAfterRedirects' in event && typeof event.urlAfterRedirects === 'string') navigations.push(event.urlAfterRedirects);
    });
    await router.navigateByUrl('/general/13/history');
    expect(url).toBe('/general/42/history');
    expect(router.url).toBe('/general/42/history');
    expect(navigations.length).toBeLessThanOrEqual(2);
  });

  it('sessão sem id: libera sem redirecionar (a tela mostra o erro)', async () => {
    session.set({});
    expect(await go('/general/99/history')).toBe('/general/99/history');
  });
});

describe('sessionUserId', () => {
  it('lê o id da sessão e ignora sessões vazias', () => {
    expect(sessionUserId({ user: { id: '42' } })).toBe('42');
    expect(sessionUserId({ user: { id: 7 } })).toBe('7');
    expect(sessionUserId({ user: { id: '  ' } })).toBeNull();
    expect(sessionUserId({})).toBeNull();
    expect(sessionUserId(null)).toBeNull();
    expect(sessionUserId({ user: { id: Number.NaN } })).toBeNull();
  });
});

describe('rota de Pedidos', () => {
  it('exige login e corrige o id da URL', () => {
    const route = GeneralRoutes.find((r) => r.path === ':userId/history');
    expect(route?.canActivate).toEqual([unauthorizedGuard, sessionUserGuard]);
  });
});
