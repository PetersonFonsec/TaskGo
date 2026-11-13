import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed,
  PermissionStatus,
  PushNotifications,
  Token
} from '@capacitor/push-notifications';

export type DevicePlatform = 'ANDROID' | 'IOS';

/** Fina camada sobre o plugin nativo, para poder ser trocada nos testes. */
@Injectable({ providedIn: 'root' })
export class NativePush {
  platform(): DevicePlatform | null {
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform();
    return platform === 'ios' ? 'IOS' : platform === 'android' ? 'ANDROID' : null;
  }

  checkPermissions(): Promise<PermissionStatus> {
    return PushNotifications.checkPermissions();
  }

  requestPermissions(): Promise<PermissionStatus> {
    return PushNotifications.requestPermissions();
  }

  register(): Promise<void> {
    return PushNotifications.register();
  }

  async onToken(listener: (token: Token) => void): Promise<void> {
    await PushNotifications.addListener('registration', listener);
  }

  async onTap(listener: (action: ActionPerformed) => void): Promise<void> {
    await PushNotifications.addListener('pushNotificationActionPerformed', listener);
  }
}
