import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Header } from './header';
import { ProfileHeader } from '../profile-header/profile-header';
import { Notification } from '@shared/components/functional/notification/notification';

describe('Header account navigation', () => {
  const user = signal<any>({ user: { id: '42', type: 'CLIENTE' } });
  const logout = jasmine.createSpy('logout');

  beforeEach(async () => {
    logout.calls.reset();
    user.set({ user: { id: '42', type: 'CLIENTE' } });
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), { provide: UserLoggedService, useValue: { user, logout } }],
    })
      .overrideComponent(Header, {
        remove: { imports: [ProfileHeader, Notification] },
        add: { schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  it('resolves both roles and updates links when the authenticated user changes', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/general/42/profile',
    );
    user.set({ user: { id: '77', type: 'PRESTADOR' } });
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/general/77/profile');
    expect(links[1].getAttribute('href')).toBe('/general/77/addresses');
    fixture.nativeElement.querySelector('[data-testid="navigation-item-logout"]').click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('omits account navigation without an authenticated user', () => {
    user.set({});
    const fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('nav a, nav button').length).toBe(0);
  });
});
