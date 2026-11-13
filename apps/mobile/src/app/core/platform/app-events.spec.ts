import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FakeResumeEvents } from '../../../testing/fakes';
import { AppEvents, NATIVE_RESUME_EVENTS } from './app-events';

const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('AppEvents', () => {
  let native: FakeResumeEvents;
  let events: AppEvents;

  beforeEach(() => {
    native = new FakeResumeEvents();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: NATIVE_RESUME_EVENTS, useValue: native }
      ]
    });
    events = TestBed.inject(AppEvents);
  });

  it('stops calling back on "online" after cleanup (teste H)', () => {
    native.native = false;
    const added = spyOn(window, 'addEventListener').and.callThrough();
    const removed = spyOn(window, 'removeEventListener').and.callThrough();
    const listener = jasmine.createSpy('listener');
    const stop = events.onReconnect(listener);
    const registered = added.calls.allArgs().find(([type]) => type === 'online')?.[1];
    expect(registered).toBeDefined();

    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    // O listener do navegador sai de fato, não só deixa de repassar.
    expect(removed).toHaveBeenCalledWith('online', registered!);
    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(native.listeners.length).toBe(0);
  });

  it('removes the native resume handle on cleanup (teste I)', async () => {
    const listener = jasmine.createSpy('listener');
    const stop = events.onReconnect(listener);
    await tick();

    native.resume();
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    await tick();
    expect(native.removed).toBe(1);
    expect(native.listeners.length).toBe(0);
    native.resume();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes a native handle that arrives after cleanup (teste J)', async () => {
    native.holdRegistration = true;
    const listener = jasmine.createSpy('listener');
    const stop = events.onReconnect(listener);
    stop();

    native.finishRegistrations();
    await tick();
    expect(native.removed).toBe(1);
    expect(native.listeners.length).toBe(0);
    native.resume();
    window.dispatchEvent(new Event('online'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores a second cleanup and a failed registration', async () => {
    const failing = { isNative: () => true, addResumeListener: () => Promise.reject(new Error('x')) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: NATIVE_RESUME_EVENTS, useValue: failing }]
    });
    const stop = TestBed.inject(AppEvents).onReconnect(() => undefined);
    await tick();
    stop();
    stop();
    expect().nothing();
  });
});
