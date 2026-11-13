import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SessionStorage } from '@app/core/auth/session-storage';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API, loginResponse, MemorySessionStorage, settle } from '../../../testing/fakes';
import { authInterceptor, isApiRequest } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: SessionStorage, useClass: MemorySessionStorage }
      ]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  async function login(): Promise<void> {
    const pending = auth.login('ana@example.com', 'secret');
    http.expectOne(`${API}/auth/login`).flush(loginResponse());
    await pending;
  }

  it('sends API requests without a token when nobody is logged in', async () => {
    const result = firstValueFrom(client.get(`${API}/categories`));
    await settle();
    const request = http.expectOne(`${API}/categories`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ data: [] });
    await result;
  });

  it('adds the bearer token to API requests only', async () => {
    await login();
    const api = firstValueFrom(client.get(`${API}/order`));
    const other = firstValueFrom(client.get('https://cdn.example.com/x.json'));
    await settle();

    const apiRequest = http.expectOne(`${API}/order`);
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer access-1');
    const otherRequest = http.expectOne('https://cdn.example.com/x.json');
    expect(otherRequest.request.headers.has('Authorization')).toBeFalse();
    apiRequest.flush([]);
    otherRequest.flush({});
    await Promise.all([api, other]);
  });

  it('renews once and replays every request that got 401 at the same time', async () => {
    await login();
    const first = firstValueFrom(client.get(`${API}/order`));
    const second = firstValueFrom(client.get(`${API}/address`));
    await settle();
    http.expectOne(`${API}/order`).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API}/address`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();

    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    refresh.flush({ access_token: 'access-2', refresh_token: 'refresh-2' });
    await settle();

    const retries = http.match((r) => r.headers.get('Authorization') === 'Bearer access-2');
    expect(retries.map((r) => r.request.url).sort()).toEqual([`${API}/address`, `${API}/order`]);
    retries.forEach((r) => r.flush({ ok: true }));
    expect(await Promise.all([first, second])).toEqual([{ ok: true }, { ok: true }]);
  });

  it('gives up with the original 401 when the session cannot be renewed', async () => {
    await login();
    const result = firstValueFrom(client.get(`${API}/order`));
    await settle();
    http.expectOne(`${API}/order`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(result).toBeRejectedWith(jasmine.objectContaining({ status: 401 }));
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('does not retry a request that fails again after renewing', async () => {
    await login();
    const result = firstValueFrom(client.get(`${API}/order`));
    await settle();
    http.expectOne(`${API}/order`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await settle();
    http.expectOne(`${API}/auth/refresh`).flush({ access_token: 'a2', refresh_token: 'r2' });
    await settle();
    http.expectOne(`${API}/order`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(result).toBeRejectedWith(jasmine.objectContaining({ status: 401 }));
  });

  it('matches only URLs under the configured API', () => {
    expect(isApiRequest(`${API}/order`, API)).toBeTrue();
    expect(isApiRequest(`${API}`, API)).toBeTrue();
    expect(isApiRequest(`${API}.evil.com/order`, API)).toBeFalse();
  });
});
