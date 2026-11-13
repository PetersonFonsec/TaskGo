import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { customer, MemorySecureStore, settle } from '../../../testing/fakes';
import { SECURE_STORE, SessionStorage } from './session-storage';

const sessionA = { id: 'a', refreshToken: 'ra', user: customer };
const sessionB = { id: 'b', refreshToken: 'rb', user: customer };

describe('SessionStorage', () => {
  describe('with the real plugin (web fallback)', () => {
    let storage: SessionStorage;

    beforeEach(() => {
      localStorage.removeItem('taskgo_session');
      localStorage.removeItem('taskgo_pending_revocations');
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      storage = TestBed.inject(SessionStorage);
    });

    it('round-trips the session and ends it', async () => {
      await storage.save(sessionA);
      expect(await storage.load()).toEqual(sessionA);

      expect(await storage.endSession({ id: 'a', refreshToken: 'ra' })).toBeTrue();
      expect(await storage.load()).toBeNull();
      expect(await storage.pendingRevocations()).toEqual([{ id: 'a', refreshToken: 'ra' }]);
      await storage.removePending('a');
      expect(await storage.pendingRevocations()).toEqual([]);
    });

    it('ignores corrupted or incomplete data', async () => {
      localStorage.setItem('taskgo_session', '{not json');
      expect(await storage.load()).toBeNull();

      localStorage.setItem('taskgo_session', JSON.stringify({ refreshToken: 'r', user: customer }));
      expect(await storage.load()).toBeNull();
    });
  });

  describe('ordering and ownership', () => {
    let store: MemorySecureStore;
    let storage: SessionStorage;

    beforeEach(() => {
      store = new MemorySecureStore();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), { provide: SECURE_STORE, useValue: store }]
      });
      storage = TestBed.inject(SessionStorage);
    });

    it('applies writes in the order they were asked, even when the first one is slow', async () => {
      const release = store.hold('set');
      const slow = storage.save(sessionA);
      const fast = storage.save(sessionB);
      await settle();
      expect(store.session()).toBeNull();

      release();
      await Promise.all([slow, fast]);
      expect(store.session()).toEqual(sessionB);
    });

    it('never removes the session of another login', async () => {
      await storage.save(sessionB);
      await storage.removeSession('a');
      expect(await storage.endSession({ id: 'a', refreshToken: 'ra' })).toBeTrue();
      expect(store.session()).toEqual(sessionB);
    });

    it('keeps the pending revocations of other sessions', async () => {
      await storage.endSession({ id: 'a', refreshToken: 'ra' });
      await storage.endSession({ id: 'b', refreshToken: 'rb' });
      await storage.endSession({ id: 'a', refreshToken: 'ra' });
      await storage.removePending('a');
      expect(store.pending()).toEqual([{ id: 'b', refreshToken: 'rb' }]);
    });

    it('does not restore a session marked as ended even if removing it failed', async () => {
      await storage.save(sessionA);
      store.failNext('remove');
      expect(await storage.endSession({ id: 'a', refreshToken: 'ra' })).toBeFalse();
      expect(store.session()).toEqual(sessionA);
      expect(await storage.load()).toBeNull();
    });

    it('keeps working after a failed operation', async () => {
      store.failNext('set');
      await expectAsync(storage.save(sessionA)).toBeRejected();
      await storage.save(sessionB);
      expect(await storage.load()).toEqual(sessionB);
    });
  });
});
