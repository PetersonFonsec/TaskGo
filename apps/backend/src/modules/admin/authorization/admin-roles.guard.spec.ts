import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';

import { ADMIN_ACTOR_KEY } from '../auth/admin-actor';
import { IS_ADMIN_PUBLIC_KEY } from './admin-public.decorator';
import { ADMIN_ROLE_CAPABILITIES, AdminCapability } from './admin-permissions';
import {
  ADMIN_CAPABILITIES_KEY,
  ADMIN_ROLES_KEY,
} from './admin-roles.decorator';
import { AdminRolesGuard } from './admin-roles.guard';

describe('AdminRolesGuard', () => {
  let guard: AdminRolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new AdminRolesGuard(reflector as unknown as Reflector);
  });

  function makeContext(role = AdminRole.ADMINISTRATOR) {
    const request = {
      [ADMIN_ACTOR_KEY]: {
        id: BigInt(42),
        role,
      },
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    } as any;
  }

  function mockMetadata({
    adminPublic = false,
    roles,
    capabilities,
  }: {
    adminPublic?: boolean;
    roles?: unknown[];
    capabilities?: unknown[];
  }) {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_ADMIN_PUBLIC_KEY) return adminPublic;
      if (key === ADMIN_ROLES_KEY) return roles;
      if (key === ADMIN_CAPABILITIES_KEY) return capabilities;
      return undefined;
    });
  }

  it('skips authorization for administrative public routes', () => {
    mockMetadata({ adminPublic: true });

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('denies when administrative metadata is absent', () => {
    mockMetadata({});

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('denies invalid administrative role metadata', () => {
    mockMetadata({ roles: ['OWNER'] });

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('denies invalid administrative capability metadata', () => {
    mockMetadata({ capabilities: ['providers:*'] });

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('allows roles explicitly declared in metadata', () => {
    mockMetadata({ roles: [AdminRole.SUPPORT] });

    expect(guard.canActivate(makeContext(AdminRole.SUPPORT))).toBe(true);
  });

  it('denies roles not declared in metadata', () => {
    mockMetadata({ roles: [AdminRole.ADMINISTRATOR] });

    expect(() => guard.canActivate(makeContext(AdminRole.SUPPORT))).toThrow(
      ForbiddenException,
    );
  });

  it.each(Object.values(AdminRole))(
    'enforces the fixed capability matrix for %s',
    (role) => {
      for (const capability of Object.values(AdminCapability)) {
        mockMetadata({ capabilities: [capability] });

        const expected = ADMIN_ROLE_CAPABILITIES[role].includes(capability);
        if (expected) {
          expect(guard.canActivate(makeContext(role))).toBe(true);
        } else {
          expect(() => guard.canActivate(makeContext(role))).toThrow(
            ForbiddenException,
          );
        }
      }
    },
  );
});
