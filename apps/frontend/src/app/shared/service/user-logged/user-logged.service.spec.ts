import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { mockUserLogged } from './user-logged.mock';

import { UserLoggedService } from './user-logged.service';

describe('UserLoggedService', () => {
  let service: UserLoggedService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(UserLoggedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('updates the current user and clears the session on logout', () => {
    service.setUserLogged(mockUserLogged);
    service.updateUser({ ...mockUserLogged.user, name: 'Maria Atualizada' });
    expect(service.user()?.user.name).toBe('Maria Atualizada');

    service.logout();
    expect(service.user()).toBeNull();
  });
});
