import { InjectionToken } from '@angular/core';
import { environment } from '@environments/environment';
import { MobileEnvironment } from '@environments/environment.model';

export const MOBILE_ENVIRONMENT = new InjectionToken<MobileEnvironment>('MOBILE_ENVIRONMENT', {
  providedIn: 'root',
  factory: () => environment
});
