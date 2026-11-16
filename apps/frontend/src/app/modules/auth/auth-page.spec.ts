import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Route, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';
import { Roles } from '@shared/enums/roles.enum';
import { AuthPage } from './auth-page';
import { AuthRoutes } from './auth.routes';
import { RegisterUser } from './services/register-user/register-user';
import { Register } from './register/register';

@Component({ template: '<h1>Filha</h1>' })
class ChildPage {}

/**
 * As rotas reais da autenticação (caminhos, títulos e data), com uma tela
 * simples no lugar de cada uma; o cadastro é a tela real, para escolher o
 * tipo de conta como a pessoa faz.
 */
const routes: Route[] = [
  {
    path: 'authenticate',
    component: AuthPage,
    children: AuthRoutes.map(({ loadComponent, ...route }) => ({
      ...route,
      component: route.path === 'register' ? Register : ChildPage,
    })),
  },
];

describe('AuthPage', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => TestBed.inject(Theme).setTheme(Roles.CUSTOMER));

  async function go(url: string) {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  const theme = () => document.documentElement.getAttribute('data-theme');
  const storedType = () => TestBed.inject(UserStorage).type();

  async function chooseProvider() {
    const element = await go('/authenticate/register');
    element.querySelector<HTMLInputElement>('#account-type-provider input')!.click();
    harness.detectChanges();
    expect(theme()).toBe(Roles.PROVIDER);
    expect(storedType()).toBe(Roles.PROVIDER);
  }

  it('shows the entry with "Entrar" and "Criar conta" when no screen is open', async () => {
    const element = await go('/authenticate');
    expect(element.querySelector('h1')?.textContent).toContain('Boas-vindas ao TaskGo');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.auth__actions a'));
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Entrar', 'Criar conta']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/authenticate/login', '/authenticate/register']);
    expect(theme()).toBe(Roles.CUSTOMER);
  });

  it('hides the entry while a child screen is open', async () => {
    const element = await go('/authenticate/login');
    expect(element.querySelector('.auth__welcome')).toBeNull();
    expect(element.querySelector('h1')?.textContent).toContain('Filha');
  });

  describe('theme follows the active route, not only the first one', () => {
    for (const [name, url] of [
      ['login', '/authenticate/login'],
      ['recovery', '/authenticate/forgot-password'],
      ['reset password', '/authenticate/reset-password'],
      ['entry', '/authenticate'],
    ]) {
      it(`register → Profissional → ${name}: client theme, account type kept`, async () => {
        await chooseProvider();
        await go(url);
        expect(theme()).toBe(Roles.CUSTOMER);
        expect(storedType()).toBe(Roles.PROVIDER);
      });
    }

    it('login → register → Profissional → next step keeps the provider theme', async () => {
      await go('/authenticate/login');
      expect(theme()).toBe(Roles.CUSTOMER);
      await chooseProvider();
      for (const url of ['/authenticate/profile', '/authenticate/contact', '/authenticate/address', '/authenticate/category']) {
        await go(url);
        expect(theme()).withContext(url).toBe(Roles.PROVIDER);
      }
    });

    it('back to register after login: the choice and the filled steps are kept', async () => {
      await chooseProvider();
      TestBed.inject(RegisterUser).completeSteps.update((steps) => ({ ...steps, profile: true }));
      await go('/authenticate/login');
      expect(theme()).toBe(Roles.CUSTOMER);

      const element = await go('/authenticate/register');
      expect(theme()).toBe(Roles.PROVIDER);
      expect(element.querySelector<HTMLInputElement>('#account-type-provider input')!.checked).toBeTrue();
      expect(element.querySelector('#category-step')).not.toBeNull();
      expect(element.querySelector('#profile-step tg-badge')?.textContent?.trim()).toBe('Feito');
    });

    it('a client account stays in the client theme across the register flow', async () => {
      await go('/authenticate/register');
      await go('/authenticate/profile');
      expect(theme()).toBe(Roles.CUSTOMER);
      expect(storedType()).toBe(Roles.CUSTOMER);
    });
  });

  it('titles the register route "Criar conta", whatever the account type', async () => {
    await go('/authenticate/register');
    expect(TestBed.inject(Title).getTitle()).toBe('Criar conta');
    await chooseProvider();
    expect(TestBed.inject(Title).getTitle()).toBe('Criar conta');
    expect(TestBed.inject(Router).url).toBe('/authenticate/register');
  });

  it('titles each register step like its heading', async () => {
    const titles: [string, string][] = [
      ['/authenticate/profile', 'Seu perfil'],
      ['/authenticate/contact', 'Contato e redes'],
      ['/authenticate/address', 'Onde você está'],
      ['/authenticate/category', 'Qual é a sua área?'],
      ['/authenticate/category/1/service', 'O que você faz?'],
    ];
    for (const [url, title] of titles) {
      await go(url);
      expect(TestBed.inject(Title).getTitle()).withContext(url).toBe(title);
    }
  });
});
