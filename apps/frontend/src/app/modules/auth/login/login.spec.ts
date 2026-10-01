import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { of } from 'rxjs';
import { UserRegister } from '@shared/service/users/user-register';
import { Utils } from '@shared/service/utils/utils.service';
import { RolesBack } from '@shared/enums/roles.enum';
import { Login } from './login';

describe('Login email destinations', () => {
  function setup(returnUrl: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl }) } },
        },
        {
          provide: UserRegister,
          useValue: { login: () => of({ user: { type: RolesBack.CUSTOMER } }) },
        },
        { provide: LiveAnnouncer, useValue: { announce: jasmine.createSpy() } },
      ],
    });
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const component = TestBed.runInInjectionContext(() => new Login());
    component.login();
    return navigate;
  }

  it('opens the evaluation after login', () => {
    expect(setup('/orders/42/review')).toHaveBeenCalledWith('/orders/42/review');
  });

  for (const url of [
    'https://evil.example',
    '//evil.example',
    '/orders/42/unknown',
    '/orders/42/../admin',
    '',
  ]) {
    it(`uses the normal home for an unsupported destination: ${url}`, () => {
      expect(setup(url)).toHaveBeenCalledWith(Utils.getRouteByRoleBack(RolesBack.CUSTOMER));
    });
  }
});
