import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function run(signedInAfterRestore: boolean) {
    const signedIn = signal(false);
    const auth = {
      isAuthenticated: signedIn.asReadonly(),
      // A sessão salva só aparece depois que o restore termina.
      restore: jasmine.createSpy('restore').and.callFake(async () => signedIn.set(signedInAfterRestore))
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: auth }
      ]
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/pedidos/42' } as RouterStateSnapshot)
    ) as Promise<boolean | UrlTree>;
    return { auth, result };
  }

  it('waits for the saved session before letting the user in', async () => {
    const { auth, result } = run(true);
    expect(await result).toBeTrue();
    expect(auth.restore).toHaveBeenCalled();
  });

  it('sends anonymous users to login and back to the same page', async () => {
    const { result } = run(false);
    const tree = (await result) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe('/entrar?voltar=%2Fpedidos%2F42');
  });
});
