import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { tokenInterceptor } from '@shared/interceptors/token/token.interceptor';
import { errorInterceptor } from '@shared/interceptors/error/error.interceptor';

import { IConfig, provideEnvironmentNgxMask } from 'ngx-mask';
import { routes } from './app.routes';

const maskConfig: Partial<IConfig> = {
  validation: false,
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([tokenInterceptor, errorInterceptor])),
    provideEnvironmentNgxMask(maskConfig),
    provideAnimationsAsync(),
  ]
};
