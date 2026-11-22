import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';

import { TokenService } from '@shared/service/token/token.service';
import { errorInterceptor } from './error.interceptor';

describe('Error Interceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => errorInterceptor(req, next));
  let clearToken: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;

  beforeEach(() => {
    clearToken = jasmine.createSpy('clearToken');
    navigateByUrl = jasmine.createSpy('navigateByUrl');
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: { clearToken } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
  });

  it('does not treat a permission 403 as an expired session', () => {
    interceptor(new HttpRequest('GET', '/resource'), () => throwError(() => new HttpErrorResponse({ status: 403 })))
      .subscribe({ error: () => undefined });
    expect(clearToken).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears the session after an authentication 401', () => {
    interceptor(new HttpRequest('GET', '/resource'), () => throwError(() => new HttpErrorResponse({ status: 401 })))
      .subscribe({ error: () => undefined });
    expect(clearToken).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
