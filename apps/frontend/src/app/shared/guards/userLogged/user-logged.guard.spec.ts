import { TestBed } from '@angular/core/testing';
import { CanActivateChildFn } from '@angular/router';

import { userLoggedGuard } from './user-logged.guard';

describe('userLoggedGuard', () => {
  const executeGuard: CanActivateChildFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => userLoggedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
