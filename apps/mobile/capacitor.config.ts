import type { CapacitorConfig } from '@capacitor/cli';

// Só para testar no emulador contra a API local em HTTP (ver docs/mobile-app.md).
// Builds das lojas usam a API em HTTPS e deixam isto desligado.
const devHttp = process.env['TASKGO_DEV_HTTP'] === '1';

const config: CapacitorConfig = {
  appId: 'com.taskgo.app',
  appName: 'TaskGo',
  webDir: 'dist/browser',
  ...(devHttp ? { server: { cleartext: true }, android: { allowMixedContent: true } } : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
