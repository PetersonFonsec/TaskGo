import { InjectionToken } from '@angular/core';
import { environment } from '@environments/environment';
import { BackofficeEnvironment } from '@environments/environment.model';

export const BACKOFFICE_ENVIRONMENT = new InjectionToken<BackofficeEnvironment>(
  'BACKOFFICE_ENVIRONMENT',
  {
    providedIn: 'root',
    factory: () => environment
  }
);
