import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AppEvents } from './core/platform/app-events';
import { PushRegistrationService } from './core/push/push-registration.service';

describe('App', () => {
  function setup(authenticated: boolean) {
    const auth = {
      restore: jasmine.createSpy().and.resolveTo(),
      isAuthenticated: () => authenticated,
      flushPendingRevocations: jasmine.createSpy().and.resolveTo()
    };
    const push = {
      sync: jasmine.createSpy().and.resolveTo('registering'),
      retry: jasmine.createSpy().and.resolveTo()
    };
    const reconnect: (() => void)[] = [];
    const events = { onReconnect: (listener: () => void) => reconnect.push(listener) };
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PushRegistrationService, useValue: push },
        { provide: AppEvents, useValue: events }
      ]
    });
    return { app: TestBed.createComponent(App).componentInstance, auth, push, reconnect };
  }

  it('restores the session and refreshes the device token on open', async () => {
    const { app, auth, push } = setup(true);
    await app.ngOnInit();
    expect(auth.restore).toHaveBeenCalled();
    expect(push.sync).toHaveBeenCalled();
  });

  it('sends pending revocations on open and retries pending work when the network returns', async () => {
    const { app, auth, push, reconnect } = setup(true);
    await app.ngOnInit();
    expect(auth.flushPendingRevocations).toHaveBeenCalledTimes(1);

    reconnect.forEach((listener) => listener());
    expect(auth.flushPendingRevocations).toHaveBeenCalledTimes(2);
    expect(push.retry).toHaveBeenCalled();
  });

  it('skips push when nobody is logged in', async () => {
    const { app, push } = setup(false);
    await app.ngOnInit();
    expect(push.sync).not.toHaveBeenCalled();
  });

  it('lazy-loads the three screens', async () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toEqual(['', 'categorias/:slug', 'entrar', '**']);
    for (const route of routes.filter((r) => r.loadComponent)) {
      expect(await route.loadComponent!()).toBeDefined();
    }
  });
});
