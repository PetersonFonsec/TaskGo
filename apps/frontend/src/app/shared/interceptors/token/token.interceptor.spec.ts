import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TokenService } from '@shared/service/token/token.service';
import { tokenInterceptor } from './token.interceptor';

describe('tokenInterceptor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [{ provide: TokenService, useValue: { token: 'secret-token' } }],
    }),
  );

  for (const url of [
    'https://viacep.com.br/ws/123/json',
    'https://api.pagar.me/tokens',
    environment.url + '.attacker.com/path',
    '//attacker.example/path',
  ]) {
    it(`does not send the session token to ${url}`, () => {
      const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse()));
      TestBed.runInInjectionContext(() => tokenInterceptor(new HttpRequest('GET', url), next));
      expect(next.calls.mostRecent().args[0].headers.has('Authorization')).toBeFalse();
    });
  }
  it('authenticates requests to the application API', () => {
    const next = jasmine.createSpy('next').and.returnValue(of(new HttpResponse()));
    TestBed.runInInjectionContext(() =>
      tokenInterceptor(new HttpRequest('GET', environment.url + '/user/1'), next),
    );
    expect(next.calls.mostRecent().args[0].headers.get('Authorization')).toBe(
      'Bearer secret-token',
    );
  });
});
