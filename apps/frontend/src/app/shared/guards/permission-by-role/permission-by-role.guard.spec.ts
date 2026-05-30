import { TestBed } from '@angular/core/testing';
import { CanActivateChildFn } from '@angular/router';

import { permissionByRoleGuard } from './permission-by-role.guard';

describe('permissionByRoleGuard', () => {
  const executeGuard: CanActivateChildFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => permissionByRoleGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
