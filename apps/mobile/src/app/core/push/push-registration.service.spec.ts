import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ActionPerformed, PermissionStatus, Token } from '@capacitor/push-notifications';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { authInterceptor } from '@app/core/http/auth.interceptor';
import { API, customer, loginResponse, MemorySecureStore, settle } from '../../../testing/fakes';
import { DevicePlatform, NativePush } from './native-push';
import { PushRegistrationService } from './push-registration.service';

const FCM = 'fcm-token:APA91bExampleExampleExample';
const noContent = { status: 204, statusText: 'No Content' };

class FakePush {
  currentPlatform: DevicePlatform | null = 'ANDROID';
  permission: PermissionStatus['receive'] = 'prompt';
  answer: PermissionStatus['receive'] = 'granted';
  requested = 0;
  registered = 0;
  tokenListeners: ((token: Token) => void)[] = [];
  tapListeners: ((action: ActionPerformed) => void)[] = [];

  platform() {
    return this.currentPlatform;
  }
  async checkPermissions(): Promise<PermissionStatus> {
    return { receive: this.permission };
  }
  async requestPermissions(): Promise<PermissionStatus> {
    this.requested++;
    this.permission = this.answer;
    return { receive: this.answer };
  }
  async register() {
    this.registered++;
  }
  async onToken(listener: (token: Token) => void) {
    this.tokenListeners.push(listener);
  }
  async onTap(listener: (action: ActionPerformed) => void) {
    this.tapListeners.push(listener);
  }
  emitToken(value: string) {
    this.tokenListeners.forEach((listener) => listener({ value }));
  }
}

describe('PushRegistrationService', () => {
  let push: FakePush;
  let service: PushRegistrationService;
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    push = new FakePush();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: SECURE_STORE, useValue: new MemorySecureStore() },
        { provide: NativePush, useValue: push }
      ]
    });
    service = TestBed.inject(PushRegistrationService);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function login(name: 'a' | 'b' = 'a'): Promise<void> {
    const pending = auth.login(`${name}@example.com`, 'secret');
    await settle();
    http.expectOne(`${API}/auth/login`).flush(
      loginResponse({
        access_token: `access-${name}`,
        refresh_token: `refresh-${name}-0123456789012345678901234567`,
        user: { ...customer, id: name }
      })
    );
    await pending;
  }

  async function logout(): Promise<void> {
    const pending = auth.logout();
    await settle();
    http.expectOne(`${API}/auth/logout`).flush(null, noContent);
    await pending;
  }

  function expectDevice(accessToken: string, token = FCM) {
    const request = http.expectOne(`${API}/devices`);
    expect(request.request.body).toEqual({ token, platform: 'ANDROID' });
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
    return request;
  }

  async function enableWithToken(): Promise<void> {
    expect(await service.enable()).toBe('registering');
    push.emitToken(FCM);
    await settle();
  }

  it('registers the device for the logged-in session', async () => {
    await login();
    await enableWithToken();
    expectDevice('access-a').flush(null, noContent);
    await settle();

    expect(service.status()).toBe('registered');
    expect(push.requested).toBe(1);
  });

  it('retries after a network failure when the connection comes back', async () => {
    await login();
    await enableWithToken();
    expectDevice('access-a').error(new ProgressEvent('error'));
    await settle();
    expect(service.status()).toBe('pending');

    void service.retry();
    await settle();
    expectDevice('access-a').flush(null, noContent);
    await settle();
    expect(service.status()).toBe('registered');
  });

  it('keeps a 5xx as pending and does not retry by itself', async () => {
    await login();
    await enableWithToken();
    expectDevice('access-a').flush(null, { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(service.status()).toBe('pending');
    http.expectNone(`${API}/devices`);
  });

  it('renews the session once on 401 and registers with the new token', async () => {
    await login();
    await enableWithToken();
    expectDevice('access-a').flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    http
      .expectOne(`${API}/auth/refresh`)
      .flush({ access_token: 'access-a2', refresh_token: 'refresh-a2-01234567890123456789012345' });
    await settle();
    expectDevice('access-a2').flush(null, noContent);
    await settle();

    expect(service.status()).toBe('registered');
  });

  it('marks a definitive rejection as failed', async () => {
    await login();
    await enableWithToken();
    expectDevice('access-a').flush(null, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(service.status()).toBe('failed');
    void service.retry();
    http.expectNone(`${API}/devices`);
  });

  it('drops a native token that arrives after logout', async () => {
    await login();
    expect(await service.enable()).toBe('registering');
    await logout();
    push.emitToken(FCM);
    await settle();

    http.expectNone(`${API}/devices`);
  });

  it('moves a pending registration to the new account after a switch', async () => {
    await login('a');
    await enableWithToken();
    const forA = expectDevice('access-a');

    await logout();
    await login('b');
    forA.flush(null, noContent);
    await settle();

    expectDevice('access-b').flush(null, noContent);
    await settle();
    expect(service.status()).toBe('registered');
  });

  it('sends the same token only once per session', async () => {
    await login();
    await enableWithToken();
    push.emitToken(FCM);
    await settle();
    expectDevice('access-a').flush(null, noContent);
    await settle();

    push.emitToken(FCM);
    await service.sync();
    await settle();
    http.expectNone(`${API}/devices`);
  });

  it('registers again after a new valid login', async () => {
    await login('a');
    await enableWithToken();
    expectDevice('access-a').flush(null, noContent);
    await logout();

    await login('b');
    expect(await service.enable()).toBe('registering');
    await settle();
    expectDevice('access-b').flush(null, noContent);
    await settle();
    expect(service.status()).toBe('registered');
    expect(push.requested).toBe(1);
  });

  it('respects a denied permission', async () => {
    await login();
    push.answer = 'denied';
    expect(await service.enable()).toBe('denied');
    expect(push.registered).toBe(0);
  });

  it('does nothing without a session and never prompts when the app opens', async () => {
    expect(await service.sync()).toBe('denied');
    expect(push.requested).toBe(0);

    push.permission = 'granted';
    expect(await service.sync()).toBe('registering');
    push.emitToken(FCM);
    await settle();
    expect(push.requested).toBe(0);
    http.expectNone(`${API}/devices`);
  });

  it('does not send a raw APNs token to an API that expects FCM', async () => {
    push.currentPlatform = 'IOS';
    await login();
    await service.enable();
    push.emitToken('a'.repeat(64));
    await settle();

    http.expectNone(`${API}/devices`);
    expect(service.status()).toBe('unsupported');
  });

  it('does nothing in the browser', async () => {
    push.currentPlatform = null;
    expect(await service.enable()).toBe('unsupported');
    expect(push.requested).toBe(0);
  });

  it('adds the native listeners only once', async () => {
    push.permission = 'granted';
    await service.sync();
    await service.sync();
    expect(push.tokenListeners.length).toBe(1);
  });

  it('opens the order when an order notification is tapped', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    push.permission = 'granted';
    await service.sync();
    push.tapListeners.forEach((listener) =>
      listener({
        actionId: 'tap',
        notification: { id: '1', data: { type: 'ORDER_ACCEPTED', orderId: '42' } }
      })
    );
    expect(navigate).toHaveBeenCalledWith('/pedidos/42');
  });

  it('opens the app home when the notification has no valid order', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    push.permission = 'granted';
    await service.sync();
    for (const data of [{ type: 'X' }, { orderId: '../entrar' }, { orderId: 42 }, undefined]) {
      push.tapListeners.forEach((listener) =>
        listener({ actionId: 'tap', notification: { id: '1', data } })
      );
    }
    expect(navigate.calls.allArgs()).toEqual([['/'], ['/'], ['/'], ['/']]);
  });
});
