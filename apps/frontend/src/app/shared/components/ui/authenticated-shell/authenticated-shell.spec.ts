import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Roles } from '@shared/enums/roles.enum';
import { Theme } from '@shared/service/theme/theme';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { AuthenticatedShell } from './authenticated-shell';

describe('AuthenticatedShell theme', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('restores the logged-in role after authentication and follows session changes', async () => {
    const user = signal({ user: { type: 'CLIENTE' } });
    TestBed.configureTestingModule({
      imports: [AuthenticatedShell],
      providers: [provideRouter([]), { provide: UserLoggedService, useValue: { user } }],
    }).overrideComponent(AuthenticatedShell, { set: { imports: [], template: '' } });
    const theme = TestBed.inject(Theme);
    theme.setTheme(Roles.PROVIDER);
    const fixture = TestBed.createComponent(AuthenticatedShell);
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.CUSTOMER);
    user.set({ user: { type: 'PRESTADOR' } });
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.PROVIDER);
  });
});
