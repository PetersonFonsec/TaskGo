import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { Roles } from '@shared/enums/roles.enum';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { InstitutionalPage } from './institutional-page';
import { InstitutionalRoutes } from './institutional.routes';

type Session = { user?: { id?: string; type?: string; name?: string } } | null;

describe('InstitutionalPage', () => {
  let user: ReturnType<typeof signal<Session>>;
  let harness: RouterTestingHarness;

  async function open(url: string, session: Session = {}) {
    user = signal<Session>(session);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'institutional', component: InstitutionalPage, children: InstitutionalRoutes }]),
        { provide: UserLoggedService, useValue: { user, logout: () => undefined } },
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  }

  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('visitante: barra do app com "Entrar", sem destinos nem menu da conta, e o rodapé', async () => {
    const el = await open('/institutional/privacy');
    const enter = el.querySelector<HTMLAnchorElement>('tg-app-bar a[tgButton]');
    expect(enter?.textContent).toContain('Entrar');
    expect(enter?.getAttribute('href')).toBe('/authenticate');
    expect(el.querySelector('tg-app-bar .tg-app-bar__brand')?.getAttribute('href')).toBe('/authenticate');
    expect(el.querySelector('tg-nav')).toBeNull();
    expect(el.querySelector('tg-account-menu')).toBeNull();
    expect(el.querySelector('app-footer')).not.toBeNull();
    expect(el.querySelector('main#conteudo')).not.toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.CUSTOMER);
  });

  it('logado como profissional: "Voltar ao app" leva à home do modo, com o tema escuro', async () => {
    const el = await open('/institutional/terms', { user: { id: '7', type: 'PRESTADOR', name: 'Bruno' } });
    const back = el.querySelector<HTMLAnchorElement>('tg-app-bar a[tgButton]');
    expect(back?.textContent).toContain('Voltar ao app');
    expect(back?.getAttribute('href')).toBe('/provider');
    expect(el.querySelector('tg-account-menu')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.PROVIDER);
  });

  it('logado como cliente: "Voltar ao app" leva a /customer', async () => {
    const el = await open('/institutional/terms', { user: { id: '3', type: 'CLIENTE' } });
    expect(el.querySelector('tg-app-bar a[tgButton]')?.getAttribute('href')).toBe('/customer');
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.CUSTOMER);
  });

  it('sessão encerrada (usuário nulo) é tratada como visitante', async () => {
    const el = await open('/institutional/terms', null);
    expect(el.querySelector('tg-app-bar a[tgButton]')?.textContent).toContain('Entrar');
  });

  it('navega entre os quatro documentos, com aria-current no atual', async () => {
    const el = await open('/institutional/security');
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.institutional__nav a'));
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Termos de uso', '/institutional/terms'],
      ['Privacidade', '/institutional/privacy'],
      ['Segurança', '/institutional/security'],
      ['Código de conduta', '/institutional/code-of-conduct'],
    ]);
    expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent?.trim())).toEqual([
      'Segurança',
    ]);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Segurança');
  });

  it('cada rota abre o seu documento com um único h1', async () => {
    const titles: Record<string, string> = {
      terms: 'Termos de uso',
      privacy: 'Privacidade',
      security: 'Segurança',
      'code-of-conduct': 'Código de conduta',
    };
    await open('/institutional/terms');
    for (const [path, title] of Object.entries(titles)) {
      await harness.navigateByUrl(`/institutional/${path}`);
      const el = harness.routeNativeElement as HTMLElement;
      expect(el.querySelectorAll('h1').length).withContext(path).toBe(1);
      expect(el.querySelector('h1')?.textContent?.trim()).withContext(path).toBe(title);
    }
  });

  it('/institutional sem documento abre os termos de uso', async () => {
    await open('/institutional');
    expect(TestBed.inject(Router).url).toBe('/institutional/terms');
  });
});
