import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import type { PermissionStatus, Token } from '@capacitor/push-notifications';

import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { SECURE_STORE } from './core/auth/session-storage';
import { MOBILE_ENVIRONMENT } from './core/config/mobile-environment.token';
import { authInterceptor } from './core/http/auth.interceptor';
import { AppEvents, NATIVE_RESUME_EVENTS } from './core/platform/app-events';
import { NativePush } from './core/push/native-push';
import { PushRegistrationService } from './core/push/push-registration.service';
import {
  API,
  customer,
  FakeResumeEvents,
  loginResponse,
  MemorySecureStore,
  settle
} from '../testing/fakes';

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
    const events = {
      onReconnect: (listener: () => void) => {
        reconnect.push(listener);
        return () => undefined;
      }
    };
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

  it('only the current instance reacts to reconnection after a re-creation (teste K)', async () => {
    const auth = {
      restore: jasmine.createSpy().and.resolveTo(),
      isAuthenticated: () => false,
      flushPendingRevocations: jasmine.createSpy().and.resolveTo()
    };
    const push = { sync: jasmine.createSpy(), retry: jasmine.createSpy().and.resolveTo() };
    const native = new FakeResumeEvents();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PushRegistrationService, useValue: push },
        { provide: NATIVE_RESUME_EVENTS, useValue: native }
      ]
    });

    const first = TestBed.createComponent(App);
    first.detectChanges();
    await first.whenStable();
    await settle();
    first.destroy();
    await settle();
    const second = TestBed.createComponent(App);
    second.detectChanges();
    await second.whenStable();
    await settle();
    auth.flushPendingRevocations.calls.reset();
    push.retry.calls.reset();

    window.dispatchEvent(new Event('online'));
    native.resume();
    expect(auth.flushPendingRevocations).toHaveBeenCalledTimes(2);
    expect(push.retry).toHaveBeenCalledTimes(2);
    expect(native.listeners.length).toBe(1);
    expect(native.removed).toBe(1);
    second.destroy();
  });
});

describe('App reconnection with real session and push (teste L)', () => {
  const FCM = 'fcm-token:APA91bExampleExampleExample';

  class GrantedPush {
    tokenListeners: ((token: Token) => void)[] = [];
    platform() {
      return 'ANDROID' as const;
    }
    async checkPermissions(): Promise<PermissionStatus> {
      return { receive: 'granted' };
    }
    async requestPermissions(): Promise<PermissionStatus> {
      return { receive: 'granted' };
    }
    async register() {}
    async onToken(listener: (token: Token) => void) {
      this.tokenListeners.push(listener);
    }
    async onTap() {}
  }

  it('resends pending revocations and device registration once per reconnection', async () => {
    const store = new MemorySecureStore();
    // Revogação pendente de uma sessão antiga, já no armazenamento seguro.
    store.data.set(
      'pending_revocations',
      JSON.stringify([{ id: 'old', refreshToken: 'refresh-old-0123456789012345678901234' }])
    );
    const native = new FakeResumeEvents();
    const nativePush = new GrantedPush();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: SECURE_STORE, useValue: store },
        { provide: NATIVE_RESUME_EVENTS, useValue: native },
        { provide: NativePush, useValue: nativePush }
      ]
    });
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    const push = TestBed.inject(PushRegistrationService);
    const offline = () => new ProgressEvent('error');

    // Primeira instância do App: abre offline e é destruída.
    const first = TestBed.createComponent(App);
    first.detectChanges();
    await settle();
    http.expectOne(`${API}/auth/logout`).error(offline());
    first.destroy();

    // Cliente entra; o registro do aparelho falha por rede e fica pendente.
    const loggingIn = auth.login('ana@example.com', 'secret');
    await settle();
    http.expectOne(`${API}/auth/login`).flush(loginResponse({ user: customer }));
    await loggingIn;
    await settle();
    http.expectOne(`${API}/auth/logout`).error(offline());
    await push.enable();
    nativePush.tokenListeners.forEach((listener) => listener({ value: FCM }));
    await settle();
    http.expectOne(`${API}/devices`).error(offline());
    await settle();
    expect(push.status()).toBe('pending');

    // Instância atual do App.
    const second = TestBed.createComponent(App);
    second.detectChanges();
    await settle();
    // Na abertura: reenvio das pendências e sincronização do push.
    http.match(`${API}/auth/logout`).forEach((request) => request.error(offline()));
    http.match(`${API}/devices`).forEach((request) => request.error(offline()));
    await settle();

    // A rede volta: uma chamada de cada, sem duplicatas da instância destruída.
    window.dispatchEvent(new Event('online'));
    await settle();
    const revocations = http.match(`${API}/auth/logout`);
    const devices = http.match(`${API}/devices`);
    expect(revocations.length).toBe(1);
    expect(devices.length).toBe(1);
    revocations[0].flush(null, { status: 204, statusText: 'No Content' });
    devices[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(store.pending()).toEqual([]);
    expect(push.status()).toBe('registered');
    second.destroy();
    http.verify();
  });
});
