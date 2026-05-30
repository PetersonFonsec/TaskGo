import { TestBed } from '@angular/core/testing';

import { UserStorage } from './user-storage';

describe('UserStorage', () => {
  let service: UserStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
