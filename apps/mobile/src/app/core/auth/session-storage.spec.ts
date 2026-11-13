import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { customer } from '../../../testing/fakes';
import { SessionStorage } from './session-storage';

// No navegador o plugin usa o localStorage; no aparelho, Keychain/Keystore.
describe('SessionStorage', () => {
  let storage: SessionStorage;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    storage = TestBed.inject(SessionStorage);
    await storage.clear();
  });

  it('round-trips the session and clears it', async () => {
    await storage.save({ refreshToken: 'r1', user: customer });
    expect(await storage.load()).toEqual({ refreshToken: 'r1', user: customer });

    await storage.clear();
    expect(await storage.load()).toBeNull();
  });

  it('ignores corrupted or incomplete data', async () => {
    localStorage.setItem('taskgo_session', '{not json');
    expect(await storage.load()).toBeNull();

    localStorage.setItem('taskgo_session', JSON.stringify({ user: customer }));
    expect(await storage.load()).toBeNull();
  });
});
