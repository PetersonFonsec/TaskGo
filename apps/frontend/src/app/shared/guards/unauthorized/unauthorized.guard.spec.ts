import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, UrlTree } from '@angular/router';
import { TokenService } from '@shared/service/token/token.service';
import { unauthorizedGuard } from './unauthorized.guard';

describe('unauthorizedGuard email destinations', () => {
  const token = { token: '' };
  beforeEach(() => {
    token.token = '';
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenService, useValue: token }],
    });
  });

  it('preserves the review destination through login', () => {
    const result = TestBed.runInInjectionContext(() =>
      unauthorizedGuard({} as any, { url: '/orders/42/review' } as any),
    );
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/authenticate/login?returnUrl=%2Forders%2F42%2Freview',
    );
  });

  it('allows authenticated users', () => {
    token.token = 'token';
    expect(
      TestBed.runInInjectionContext(() =>
        unauthorizedGuard({} as any, { url: '/orders/42' } as any),
      ),
    ).toBeTrue();
  });
});
