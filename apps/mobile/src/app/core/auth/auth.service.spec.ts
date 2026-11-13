import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API, customer, loginResponse, MemorySecureStore, settle } from '../../../testing/fakes';
import { AuthService, ProviderAccountError } from './auth.service';
import { SECURE_STORE, SessionStorage, StoredSession } from './session-storage';

const otherCustomer = { ...customer, id: '8', name: 'Bruno Dias', email: 'bruno@example.com' };
const unauthorized = { status: 401, statusText: 'Unauthorized' };
const noContent = { status: 204, statusText: 'No Content' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let store: MemorySecureStore;

  function setup(saved: StoredSession | null = null): void {
    store = new MemorySecureStore();
    if (saved) store.data.set('session', JSON.stringify(saved));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } },
        { provide: SECURE_STORE, useValue: store }
      ]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  /** Simula reabrir o app: serviços novos, mesmo armazenamento seguro. */
  async function reopen(): Promise<AuthService> {
    const injector = Injector.create({
      providers: [
        { provide: SessionStorage, useClass: SessionStorage },
        { provide: AuthService, useClass: AuthService }
      ],
      parent: TestBed.inject(Injector)
    });
    const reopened = injector.get(AuthService);
    await reopened.restore();
    return reopened;
  }

  afterEach(() => http.verify());

  async function login(refresh = 'refresh-1', user = customer): Promise<void> {
    const pending = auth.login(user.email, 'secret');
    await settle();
    http
      .expectOne(`${API}/auth/login`)
      .flush(loginResponse({ refresh_token: refresh, access_token: `access-${refresh}`, user }));
    await pending;
  }

  function expectRefresh(body: string) {
    const request = http.expectOne(`${API}/auth/refresh`);
    expect(request.request.body).toEqual({ refresh_token: body });
    return request;
  }

  function expectLogout(body: string) {
    const request = http.expectOne(`${API}/auth/logout`);
    expect(request.request.body).toEqual({ refresh_token: body });
    return request;
  }

  describe('login e sessão', () => {
    it('saves the refresh token securely and keeps the access token in memory', async () => {
      setup();
      await login();

      expect(auth.isAuthenticated()).toBeTrue();
      expect(store.session()?.refreshToken).toBe('refresh-1');
      expect(store.session()?.user).toEqual(customer);
      expect(store.data.get('session')).not.toContain('access-refresh-1');
      expect(await auth.accessToken()).toBe('access-refresh-1');
    });

    it('refuses provider accounts and revokes the session the API just opened', async () => {
      setup();
      const pending = auth.login('pro@example.com', 'secret');
      await settle();
      http
        .expectOne(`${API}/auth/login`)
        .flush(loginResponse({ user: { ...customer, type: 'PRESTADOR' }, refresh_token: 'pro-refresh' }));
      await settle();
      expectLogout('pro-refresh').flush(null, noContent);

      await expectAsync(pending).toBeRejectedWithError(ProviderAccountError);
      expect(auth.isAuthenticated()).toBeFalse();
      expect(store.session()).toBeNull();
      expect(store.pending()).toEqual([]);
    });

    it('restores a saved session and gets an access token on first use', async () => {
      setup({ id: 's1', refreshToken: 'saved', user: customer });
      await auth.restore();
      expect(auth.user()).toEqual(customer);

      const token = auth.accessToken();
      await settle();
      expectRefresh('saved').flush({ access_token: 'access-2', refresh_token: 'refresh-2' });

      expect(await token).toBe('access-2');
      expect(store.session()).toEqual({ id: 's1', refreshToken: 'refresh-2', user: customer });
    });

    it('ends the local session when the API refuses the refresh token', async () => {
      setup();
      await login();
      const result = auth.refresh();
      await settle();
      expectRefresh('refresh-1').flush(null, unauthorized);

      expect(await result).toBeNull();
      expect(auth.isAuthenticated()).toBeFalse();
      expect(store.session()).toBeNull();
    });

    it('keeps the session when the refresh fails for lack of network', async () => {
      setup();
      await login();
      const result = auth.refresh();
      await settle();
      expectRefresh('refresh-1').error(new ProgressEvent('error'));

      await expectAsync(result).toBeRejected();
      expect(auth.isAuthenticated()).toBeTrue();
      expect(store.session()?.refreshToken).toBe('refresh-1');
    });
  });

  describe('refresh concorrente (cenário E)', () => {
    it('sends a single refresh for concurrent callers and stores the newest token', async () => {
      setup();
      await login();
      const generation = auth.generation();

      const first = auth.refresh();
      const second = auth.refresh();
      const third = auth.accessTokenAfterRejection('access-refresh-1', generation);
      await settle();
      expectRefresh('refresh-1').flush({ access_token: 'a2', refresh_token: 'r2' });

      expect(await Promise.all([first, second, third])).toEqual(['a2', 'a2', 'a2']);
      expect(store.session()?.refreshToken).toBe('r2');

      // A próxima renovação usa o token rotacionado, nunca o antigo.
      const next = auth.refresh();
      await settle();
      expectRefresh('r2').flush({ access_token: 'a3', refresh_token: 'r3' });
      expect(await next).toBe('a3');
    });

    it('does not refresh again when another request already renewed the token', async () => {
      setup();
      await login();
      const generation = auth.generation();
      const renewed = auth.refresh();
      await settle();
      expectRefresh('refresh-1').flush({ access_token: 'a2', refresh_token: 'r2' });
      await renewed;

      expect(await auth.accessTokenAfterRejection('access-refresh-1', generation)).toBe('a2');
    });

    it('never hands a token of the new session to a request of the old one', async () => {
      setup();
      await login();
      const oldGeneration = auth.generation();
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').flush(null, noContent);
      await loggingOut;
      await login('refresh-b', otherCustomer);

      expect(await auth.accessTokenAfterRejection('access-refresh-1', oldGeneration)).toBeNull();
    });
  });

  describe('logout', () => {
    it('waits for the API to confirm the revocation', async () => {
      setup();
      await login();
      let done = false;
      const loggingOut = auth.logout().then((result) => ((done = true), result));
      await settle();

      expect(auth.isAuthenticated()).toBeFalse();
      expect(await auth.accessToken()).toBeNull();
      expect(done).toBeFalse();
      expectLogout('refresh-1').flush(null, noContent);

      expect(await loggingOut).toEqual({
        remote: 'revoked',
        retry: 'none',
        pendingPersisted: true,
        localCleared: true
      });
      expect(store.session()).toBeNull();
      expect(store.pending()).toEqual([]);
    });

    it('revokes the newest token when a refresh is in flight (cenário B / teste G)', async () => {
      setup();
      await login();
      void auth.refresh();
      const loggingOut = auth.logout();
      expect(auth.isAuthenticated()).toBeFalse();
      await settle();
      expectRefresh('refresh-1').flush({ access_token: 'a2', refresh_token: 'r2' });
      await settle();
      expectLogout('r2').flush(null, noContent);

      expect((await loggingOut).remote).toBe('revoked');
      expect(auth.isAuthenticated()).toBeFalse();
      expect(await auth.accessToken()).toBeNull();
      expect(store.session()).toBeNull();
      expect((await reopen()).isAuthenticated()).toBeFalse();
    });

    it('keeps an unusable pending revocation when offline and retries it later', async () => {
      setup();
      await login();
      const sessionId = store.session()!.id;
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').error(new ProgressEvent('error'));

      expect(await loggingOut).toEqual({
        remote: 'unconfirmed',
        retry: 'durable',
        pendingPersisted: true,
        localCleared: true
      });
      expect(store.session()).toBeNull();
      expect(store.pending()).toEqual([{ id: sessionId, refreshToken: 'refresh-1' }]);

      // Reinício com a pendência gravada: o app novo não restaura a sessão e
      // reenvia a revogação quando a conexão voltar.
      const reopened = await reopen();
      expect(reopened.isAuthenticated()).toBeFalse();
      const flushing = reopened.flushPendingRevocations();
      await settle();
      expectLogout('refresh-1').flush(null, noContent);
      await flushing;
      expect(store.pending()).toEqual([]);
    });

    it('keeps the pending revocation after a server error and drops it on a definitive rejection', async () => {
      setup();
      await login();
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').flush(null, { status: 503, statusText: 'Unavailable' });
      expect((await loggingOut).remote).toBe('unconfirmed');
      expect(store.pending().length).toBe(1);

      const flushing = auth.flushPendingRevocations();
      await settle();
      expectLogout('refresh-1').flush(null, { status: 400, statusText: 'Bad Request' });
      await flushing;
      expect(store.pending()).toEqual([]);
    });

    it('treats a repeated revocation as harmless', async () => {
      setup();
      await login();
      const loggingOut = auth.logout();
      const flushing = auth.flushPendingRevocations();
      await settle();
      http.match(`${API}/auth/logout`).forEach((request) => request.flush(null, noContent));
      await Promise.all([loggingOut, flushing]);

      expect(store.pending()).toEqual([]);
      expect(store.session()).toBeNull();
      await auth.flushPendingRevocations();
      http.expectNone(`${API}/auth/logout`);
    });

    it('reports a secure storage failure and still never restores the session', async () => {
      setup();
      await login();
      store.failNext('remove');
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').error(new ProgressEvent('error'));

      expect(await loggingOut).toEqual({
        remote: 'unconfirmed',
        retry: 'durable',
        pendingPersisted: true,
        localCleared: false
      });
      // O registro ficou no Keychain, mas está marcado como encerrado.
      expect(store.session()).not.toBeNull();
      expect((await reopen()).isAuthenticated()).toBeFalse();
    });

    it('reports a pending write failure even when the API confirms (teste C)', async () => {
      setup();
      await login();
      store.failNext('set');
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').flush(null, noContent);

      expect(await loggingOut).toEqual({
        remote: 'revoked',
        retry: 'none',
        pendingPersisted: false,
        localCleared: true
      });
      expect(store.pending()).toEqual([]);
      expect((await reopen()).isAuthenticated()).toBeFalse();
    });

    it('never claims a durable retry when storage and network fail together (teste D)', async () => {
      setup();
      await login();
      store.failNext('set');
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').error(new ProgressEvent('error'));

      expect(await loggingOut).toEqual({
        remote: 'unconfirmed',
        retry: 'memory',
        pendingPersisted: false,
        localCleared: true
      });
      expect(auth.isAuthenticated()).toBeFalse();
      expect(await auth.accessToken()).toBeNull();
      expect(store.pending()).toEqual([]);

      // Mesmo processo, conexão de volta: a tentativa em memória é reenviada.
      const flushing = auth.flushPendingRevocations();
      await settle();
      expectLogout('refresh-1').flush(null, noContent);
      await flushing;
      await auth.flushPendingRevocations();
      http.expectNone(`${API}/auth/logout`);
    });

    it('moves a memory-only revocation to secure storage once storage works again', async () => {
      setup();
      await login();
      const sessionId = store.session()!.id;
      store.failNext('set');
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-1').error(new ProgressEvent('error'));
      expect((await loggingOut).retry).toBe('memory');

      const flushing = auth.flushPendingRevocations();
      await settle();
      expectLogout('refresh-1').error(new ProgressEvent('error'));
      await flushing;
      expect(store.pending()).toEqual([{ id: sessionId, refreshToken: 'refresh-1' }]);

      // Agora durável: o próximo reenvio vem do armazenamento, uma vez só.
      const again = auth.flushPendingRevocations();
      await settle();
      expectLogout('refresh-1').flush(null, noContent);
      await again;
      expect(store.pending()).toEqual([]);
    });

    describe('reinício do app (teste E)', () => {
      it('has nothing to resend after a confirmed revocation', async () => {
        setup();
        await login();
        const loggingOut = auth.logout();
        await settle();
        expectLogout('refresh-1').flush(null, noContent);
        await loggingOut;

        const reopened = await reopen();
        expect(reopened.isAuthenticated()).toBeFalse();
        await reopened.flushPendingRevocations();
        http.expectNone(`${API}/auth/logout`);
      });

      it('loses the memory-only retry after a restart and still does not restore the session', async () => {
        setup();
        await login();
        store.failNext('set');
        const loggingOut = auth.logout();
        await settle();
        expectLogout('refresh-1').error(new ProgressEvent('error'));
        expect((await loggingOut).retry).toBe('memory');

        // Limitação real: sem armazenamento, nada sobra para o app novo reenviar.
        const reopened = await reopen();
        expect(reopened.isAuthenticated()).toBeFalse();
        await reopened.flushPendingRevocations();
        http.expectNone(`${API}/auth/logout`);
      });
    });

    it('resends an old revocation without touching the next account (teste F)', async () => {
      setup();
      await login('refresh-a');
      const loggingOut = auth.logout();
      await settle();
      expectLogout('refresh-a').error(new ProgressEvent('error'));
      expect((await loggingOut).retry).toBe('durable');

      const loggingIn = auth.login(otherCustomer.email, 'secret');
      await settle();
      http
        .expectOne(`${API}/auth/login`)
        .flush(loginResponse({ refresh_token: 'refresh-b', access_token: 'access-b', user: otherCustomer }));
      await loggingIn;
      await settle();
      // O login dispara o reenvio da pendência de A.
      expectLogout('refresh-a').flush(null, noContent);
      await auth.flushPendingRevocations();

      expect(auth.user()).toEqual(otherCustomer);
      expect(await auth.accessToken()).toBe('access-b');
      expect(store.session()?.refreshToken).toBe('refresh-b');
      expect(store.pending()).toEqual([]);
    });

    it('does not touch a new login when the old revocation finishes later (cenário C)', async () => {
      setup();
      await login('refresh-a');
      const loggingOut = auth.logout();
      await settle();
      const revokeA = expectLogout('refresh-a');

      await login('refresh-b', otherCustomer);
      await settle();
      // O login reenvia as pendências: a mesma revogação de A pode sair duas vezes.
      http.match(`${API}/auth/logout`).forEach((request) => {
        expect(request.request.body).toEqual({ refresh_token: 'refresh-a' });
        request.flush(null, noContent);
      });
      revokeA.flush(null, noContent);
      await loggingOut;
      await settle();

      expect(auth.user()).toEqual(otherCustomer);
      expect(await auth.accessToken()).toBe('access-refresh-b');
      expect(store.session()?.refreshToken).toBe('refresh-b');
      expect(store.pending()).toEqual([]);
      expect((await reopen()).user()).toEqual(otherCustomer);
    });
  });

  describe('corridas com o armazenamento', () => {
    it('ignores an old restore that finishes after a new login (cenário A)', async () => {
      setup({ id: 'old', refreshToken: 'refresh-a', user: customer });
      const release = store.hold('get');
      const restoring = auth.restore();

      const loggingIn = auth.login(otherCustomer.email, 'secret');
      await settle();
      http
        .expectOne(`${API}/auth/login`)
        .flush(loginResponse({ refresh_token: 'refresh-b', access_token: 'access-b', user: otherCustomer }));
      release();
      await Promise.all([restoring, loggingIn]);

      expect(auth.user()).toEqual(otherCustomer);
      expect(await auth.accessToken()).toBe('access-b');
      expect(store.session()?.refreshToken).toBe('refresh-b');
    });

    it('persists only the current session when an old write finishes late (cenário D)', async () => {
      setup();
      await login('refresh-a');
      // A gravação do token renovado de A fica presa no Keychain.
      const releaseSave = store.hold('set');
      const refreshing = auth.refresh();
      await settle();
      expectRefresh('refresh-a').flush({ access_token: 'a2', refresh_token: 'refresh-a2' });
      await settle();

      // Logout de A e login de B enquanto a gravação antiga ainda não terminou.
      const loggingOut = auth.logout();
      const loggingIn = auth.login(otherCustomer.email, 'secret');
      await settle();
      http
        .expectOne(`${API}/auth/login`)
        .flush(loginResponse({ refresh_token: 'refresh-b', access_token: 'access-b', user: otherCustomer }));
      await settle();

      releaseSave();
      await settle();
      // O logout e a reenvio das pendências (após o login de B) revogam A; a API é idempotente.
      const revocations = http.match(`${API}/auth/logout`);
      expect(revocations.length).toBeGreaterThan(0);
      revocations.forEach((request) => {
        expect(request.request.body).toEqual({ refresh_token: 'refresh-a2' });
        request.flush(null, noContent);
      });
      await Promise.all([refreshing, loggingOut, loggingIn]);
      await settle();

      // Revogações repetidas só removem a pendência de novo, sem tocar na sessão de B.
      expect(store.log.slice(6).every((entry) => entry === 'remove pending_revocations')).toBeTrue();
      expect(store.log.slice(0, 6)).toEqual([
        'set session', // login A
        'set session', // renovação de A (atrasada)
        'set pending_revocations', // logout de A
        'remove session',
        'set session', // login B
        'remove pending_revocations' // revogação de A confirmada
      ]);
      expect(store.session()?.refreshToken).toBe('refresh-b');
      expect(store.session()?.user).toEqual(otherCustomer);
      expect(store.pending()).toEqual([]);
      expect(auth.user()).toEqual(otherCustomer);
    });
  });
});
