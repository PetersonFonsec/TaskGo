import { InjectionToken } from '@angular/core';
import { environment } from '@environments/environment';
import { BackofficeEnvironment } from '@environments/environment.model';

declare global {
  interface Window {
    __BACKOFFICE_CONFIG__?: Partial<BackofficeEnvironment>;
  }
}

export const BACKOFFICE_ENVIRONMENT = new InjectionToken<BackofficeEnvironment>(
  'BACKOFFICE_ENVIRONMENT',
  {
    providedIn: 'root',
    factory: () => ({
      ...environment,
      ...(globalThis.window?.__BACKOFFICE_CONFIG__ ?? {}),
    }),
  },
);
