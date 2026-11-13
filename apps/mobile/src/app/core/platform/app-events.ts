import { inject, Injectable, InjectionToken } from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

/** Ponte para o evento nativo de volta ao primeiro plano, trocável nos testes. */
export interface NativeResumeEvents {
  isNative(): boolean;
  addResumeListener(listener: () => void): Promise<PluginListenerHandle>;
}

export const NATIVE_RESUME_EVENTS = new InjectionToken<NativeResumeEvents>('NATIVE_RESUME_EVENTS', {
  providedIn: 'root',
  factory: () => ({
    isNative: () => Capacitor.isNativePlatform(),
    addResumeListener: (listener) => CapacitorApp.addListener('resume', listener)
  })
});

/** Remove os listeners de uma inscrição. Chamar mais de uma vez não tem efeito. */
export type Unsubscribe = () => void;

/**
 * Momentos em que vale tentar de novo o que dependia da rede: a conexão voltou
 * ou o app voltou para a frente. Sem timers, para não gastar bateria.
 */
@Injectable({ providedIn: 'root' })
export class AppEvents {
  readonly #native = inject(NATIVE_RESUME_EVENTS);

  onReconnect(listener: () => void): Unsubscribe {
    let active = true;
    let handle: PluginListenerHandle | null = null;
    const notify = () => {
      if (active) listener();
    };

    globalThis.addEventListener?.('online', notify);
    if (this.#native.isNative()) {
      // O registro nativo é assíncrono: se a inscrição acabar antes, o handle
      // que chegar depois é removido na hora.
      this.#native.addResumeListener(notify).then(
        (registered) => {
          if (active) handle = registered;
          else removeHandle(registered);
        },
        () => undefined
      );
    }

    return () => {
      if (!active) return;
      active = false;
      globalThis.removeEventListener?.('online', notify);
      if (handle) removeHandle(handle);
      handle = null;
    };
  }
}

function removeHandle(handle: PluginListenerHandle): void {
  void handle.remove().catch(() => undefined);
}
