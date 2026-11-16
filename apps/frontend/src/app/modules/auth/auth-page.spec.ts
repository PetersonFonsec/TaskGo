import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';
import { Roles } from '@shared/enums/roles.enum';
import { AuthPage } from './auth-page';

@Component({ template: '<h1>Filha</h1>' })
class ChildPage {}

describe('AuthPage', () => {
  async function setup(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'authenticate', component: AuthPage, children: [{ path: 'login', component: ChildPage }] },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('shows the entry with "Entrar" and "Criar conta" when no screen is open', async () => {
    const element = await setup('/authenticate');
    expect(element.querySelector('h1')?.textContent).toContain('Boas-vindas ao TaskGo');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.auth__actions a'));
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Entrar', 'Criar conta']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/authenticate/login', '/authenticate/register']);
  });

  it('hides the entry while a child screen is open', async () => {
    const element = await setup('/authenticate/login');
    expect(element.querySelector('.auth__welcome')).toBeNull();
    expect(element.querySelector('h1')?.textContent).toContain('Filha');
  });

  it('starts with the client theme and keeps the register type in sync with it', async () => {
    await setup('/authenticate');
    const theme = TestBed.inject(Theme);
    const storage = TestBed.inject(UserStorage);
    expect(storage.type()).toBe(Roles.CUSTOMER);
    theme.setTheme(Roles.PROVIDER);
    expect(storage.type()).toBe(Roles.PROVIDER);
  });

  it('goes back to the client theme on "Criar conta"', async () => {
    const element = await setup('/authenticate');
    const theme = TestBed.inject(Theme);
    theme.setTheme(Roles.PROVIDER);
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    element.querySelectorAll<HTMLAnchorElement>('.auth__actions a')[1].click();
    expect(TestBed.inject(UserStorage).type()).toBe(Roles.CUSTOMER);
  });
});
