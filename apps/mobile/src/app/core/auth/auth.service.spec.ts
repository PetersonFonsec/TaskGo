import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API, customer, loginResponse, MemorySessionStorage, settle } from '../../../testing/fakes';
import { AuthService, ProviderAccountError } from './auth.service';
import { SessionStorage } from './session-storage';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let storage: MemorySessionStorage;

  function setup(stored: MemorySessionStorage['stored'] = null): void {
    storage = new MemorySessionStorage();
    storage.stored = stored;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: SessionStorage, useValue: storage }
      ]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  async function login(): Promise<void> {
    const pending = auth.login('ana@example.com', 'secret');
    http.expectOne(`${API}/auth/login`).flush(loginResponse());
    await pending;
  }

  it('saves the refresh token securely and keeps the access token in memory', async () => {
    setup();
    await login();

    expect(auth.isAuthenticated()).toBeTrue();
    expect(storage.stored).toEqual({ refreshToken: 'refresh-1', user: customer });
    expect(JSON.stringify(storage.stored)).not.toContain('access-1');
    expect(await auth.accessToken()).toBe('access-1');
  });

  it('refuses provider accounts and revokes the session the API just opened', async () => {
    setup();
    const pending = auth.login('pro@example.com', 'secret');
    http
      .expectOne(`${API}/auth/login`)
      .flush(loginResponse({ user: { ...customer, type: 'PRESTADOR' }, refresh_token: 'pro-refresh' }));

    await expectAsync(pending).toBeRejectedWithError(ProviderAccountError);
    const revoke = http.expectOne(`${API}/auth/logout`);
    expect(revoke.request.body).toEqual({ refresh_token: 'pro-refresh' });
    revoke.flush(null);
    expect(auth.isAuthenticated()).toBeFalse();
    expect(storage.stored).toBeNull();
  });

  it('restores a saved session and gets an access token on first use', async () => {
    setup({ refreshToken: 'saved', user: customer });
    await auth.restore();
    expect(auth.user()).toEqual(customer);

    const token = auth.accessToken();
    await settle();
    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refresh_token: 'saved' });
    refresh.flush({ access_token: 'access-2', refresh_token: 'refresh-2' });

    expect(await token).toBe('access-2');
    expect(storage.stored?.refreshToken).toBe('refresh-2');
  });

  it('sends a single refresh for concurrent callers and stores the newest token', async () => {
    setup();
    await login();

    const first = auth.refresh();
    const second = auth.refresh();
    const third = auth.accessTokenAfterRejection('access-1');
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush({ access_token: 'a2', refresh_token: 'r2' });

    expect(await Promise.all([first, second, third])).toEqual(['a2', 'a2', 'a2']);
    expect(storage.stored?.refreshToken).toBe('r2');

    // A próxima renovação usa o token rotacionado, nunca o antigo.
    const next = auth.refresh();
    await settle();
    const again = http.expectOne(`${API}/auth/refresh`);
    expect(again.request.body).toEqual({ refresh_token: 'r2' });
    again.flush({ access_token: 'a3', refresh_token: 'r3' });
    expect(await next).toBe('a3');
  });

  it('does not refresh again when another request already renewed the token', async () => {
    setup();
    await login();
    const renewed = auth.refresh();
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush({ access_token: 'a2', refresh_token: 'r2' });
    await renewed;

    expect(await auth.accessTokenAfterRejection('access-1')).toBe('a2');
  });

  it('ends the local session when the API refuses the refresh token', async () => {
    setup();
    await login();
    const result = auth.refresh();
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(await result).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(storage.stored).toBeNull();
  });

  it('keeps the session when the refresh fails for lack of network', async () => {
    setup();
    await login();
    const result = auth.refresh();
    await settle();
    http.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));

    await expectAsync(result).toBeRejected();
    expect(auth.isAuthenticated()).toBeTrue();
    expect(storage.stored?.refreshToken).toBe('refresh-1');
  });

  it('logs out with the newest refresh token when a refresh is in flight', async () => {
    setup();
    await login();
    void auth.refresh();
    const loggingOut = auth.logout();
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush({ access_token: 'a2', refresh_token: 'r2' });
    await loggingOut;

    const logout = http.expectOne(`${API}/auth/logout`);
    expect(logout.request.body).toEqual({ refresh_token: 'r2' });
    logout.flush(null);
    expect(auth.isAuthenticated()).toBeFalse();
    expect(storage.stored).toBeNull();
  });
});
