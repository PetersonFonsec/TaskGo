import { TestBed } from '@angular/core/testing';

import { RegisterUser } from './register-user';

describe('RegisterUser', () => {
  let service: RegisterUser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegisterUser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
