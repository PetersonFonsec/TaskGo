import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { RolesBack } from '@shared/enums/roles.enum';
import { Utils } from '@shared/service/utils/utils.service';
import { permissionByRoleGuard } from './permission-by-role.guard';

describe('permissionByRoleGuard', () => {
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        {
          provide: UserLoggedService,
          useValue: { user: () => ({ user: { type: RolesBack.CUSTOMER } }) },
        },
      ],
    });
  });

  function executeGuard(roles: string[]) {
    return TestBed.runInInjectionContext(() =>
      permissionByRoleGuard(roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('allows a user whose role is permitted', () => {
    expect(executeGuard([RolesBack.CUSTOMER])).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('denies access and redirects a user whose role is not permitted', () => {
    expect(executeGuard([RolesBack.PROVIDER])).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(
      Utils.getRouteByRoleBack(RolesBack.CUSTOMER),
    );
  });
});
