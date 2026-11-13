import { Injectable } from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Momentos em que vale tentar de novo o que dependia da rede: a conexão voltou
 * ou o app voltou para a frente. Sem timers, para não gastar bateria.
 */
@Injectable({ providedIn: 'root' })
export class AppEvents {
  onReconnect(listener: () => void): void {
    globalThis.addEventListener?.('online', listener);
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('resume', listener);
    }
  }
}
