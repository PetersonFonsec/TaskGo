import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// The browser sends the HttpOnly session cookie only to the configured API.
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url)) return next(req);
  return next(req.clone({ withCredentials: true, setHeaders: { Accept: 'application/json' } }));
};

export function isApiUrl(url: string): boolean {
  try {
    const base = new URL(environment.url);
    const target = new URL(url, base);
    const prefix = base.pathname.replace(/\/$/, '');
    return (
      target.origin === base.origin &&
      (target.pathname === prefix || target.pathname.startsWith(prefix + '/'))
    );
  } catch {
    return false;
  }
}
