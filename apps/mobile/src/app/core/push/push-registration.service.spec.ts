import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ActionPerformed, PermissionStatus, Token } from '@capacitor/push-notifications';

import { AuthService } from '@app/core/auth/auth.service';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API } from '../../../testing/fakes';
import { DevicePlatform, NativePush } from './native-push';
import { PushRegistrationService } from './push-registration.service';

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
}

describe('PushRegistrationService', () => {
  let push: FakePush;
  let service: PushRegistrationService;
  let http: HttpTestingController;
  let authenticated: boolean;

  beforeEach(() => {
    push = new FakePush();
    authenticated = true;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: NativePush, useValue: push },
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } }
      ]
    });
    service = TestBed.inject(PushRegistrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does nothing in the browser', async () => {
    push.currentPlatform = null;
    expect(await service.enable()).toBe('unsupported');
    expect(push.requested).toBe(0);
  });

  it('asks for permission after login and sends the token to the API', async () => {
    expect(await service.enable()).toBe('registering');
    expect(push.requested).toBe(1);
    expect(push.registered).toBe(1);

    push.tokenListeners.forEach((listener) => listener({ value: 'fcm-token-123456789012345' }));
    const request = http.expectOne(`${API}/devices`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'fcm-token-123456789012345', platform: 'ANDROID' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('respects a denied permission', async () => {
    push.answer = 'denied';
    expect(await service.enable()).toBe('denied');
    expect(push.registered).toBe(0);
  });

  it('never prompts when the app just opens', async () => {
    expect(await service.sync()).toBe('denied');
    expect(push.requested).toBe(0);

    push.permission = 'granted';
    expect(await service.sync()).toBe('registering');
    expect(push.requested).toBe(0);
  });

  it('adds the listeners only once across logins', async () => {
    push.permission = 'granted';
    await service.enable();
    await service.enable();
    expect(push.tokenListeners.length).toBe(1);
    expect(push.registered).toBe(2);
  });

  it('drops a token that arrives after logout', async () => {
    await service.enable();
    authenticated = false;
    push.tokenListeners.forEach((listener) => listener({ value: 'late-token-1234567890123' }));
    expect(push.tokenListeners.length).toBe(1);
    http.expectNone(`${API}/devices`);
  });

  it('opens the app home when a notification is tapped', async () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    await service.enable();
    push.tapListeners.forEach((listener) =>
      listener({ actionId: 'tap', notification: { id: '1', data: { type: 'ORDER_ACCEPTED' } } })
    );
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
