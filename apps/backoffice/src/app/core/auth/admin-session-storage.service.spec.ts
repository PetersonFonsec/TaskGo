import { TestBed } from '@angular/core/testing';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { adminJwt } from './admin-auth.service.spec';
import { AdminOperator } from './admin-session.model';
import { AdminSessionStorageService } from './admin-session-storage.service';

const operator: AdminOperator = {
  id: '42',
  name: 'Admin Operator',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  active: true,
  activatedAt: '2026-07-04T12:00:00.000Z'
};

describe('AdminSessionStorageService', () => {
  let service: AdminSessionStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: BACKOFFICE_ENVIRONMENT,
          useValue: {
            production: false,
            apiUrl: '/admin',
            adminTokenStorageKey: 'proxi.backoffice.test.adminToken'
          }
        }
      ]
    });

    service = TestBed.inject(AdminSessionStorageService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('restores valid administrative sessions from Backoffice storage', () => {
    const token = adminJwt({ tokenKind: 'admin', role: 'ADMINISTRATOR' });

    service.save({ token, operator });

    expect(service.restore()).toEqual({ token, operator });
  });

  it('clears corrupt or non-administrative restored sessions', () => {
    localStorage.setItem('proxi.backoffice.test.adminToken', adminJwt({ tokenKind: 'user' }));
    localStorage.setItem('proxi.backoffice.test.adminToken.identity', '{"id":42}');

    expect(service.restore()).toBeNull();
    expect(localStorage.getItem('proxi.backoffice.test.adminToken')).toBeNull();
  });

  it('returns null for malformed token payloads', () => {
    expect(service.decodeTokenPayload('not-a-token')).toBeNull();
    expect(service.isAdministrativeToken('not-a-token')).toBeFalse();
  });
});
