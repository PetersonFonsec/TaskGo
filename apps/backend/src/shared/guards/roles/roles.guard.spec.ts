import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserType } from '@prisma/client';

import { TOKEN_KEY } from '../../../modules/auth/auth.guard';
import { CUSTOMER_ROLES_KEY } from '../../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  function context(identity?: unknown): ExecutionContext {
    return {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () =>
        ({
          getRequest: () => ({ [TOKEN_KEY]: identity }),
        }) as never,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === CUSTOMER_ROLES_KEY ? undefined : false,
    );
  });

  it('allows a verified provider when PRESTADOR is required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === CUSTOMER_ROLES_KEY ? [UserType.PRESTADOR] : false,
    );

    expect(
      guard.canActivate(context({ id: '42', role: UserType.PRESTADOR })),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      CUSTOMER_ROLES_KEY,
      expect.any(Array),
    );
  });

  it('rejects a verified customer when PRESTADOR is required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === CUSTOMER_ROLES_KEY ? [UserType.PRESTADOR] : false,
    );

    expect(
      guard.canActivate(context({ id: '42', role: UserType.CLIENTE })),
    ).toBe(false);
  });

  it.each([
    ['missing identity', undefined],
    ['missing role', { id: '42' }],
    ['unsupported role', { id: '42', role: 'ADMIN' }],
    ['missing id', { role: UserType.PRESTADOR }],
    ['invalid id', { id: 'attacker', role: UserType.PRESTADOR }],
  ])('rejects %s for a provider role requirement', (_label, identity) => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === CUSTOMER_ROLES_KEY ? [UserType.PRESTADOR] : false,
    );

    expect(guard.canActivate(context(identity))).toBe(false);
  });

  it.each([[], ['ADMIN'], 'PRESTADOR', null])(
    'rejects invalid role metadata: %p',
    (metadata) => {
      reflector.getAllAndOverride.mockImplementation((key: string) =>
        key === CUSTOMER_ROLES_KEY ? metadata : false,
      );

      expect(
        guard.canActivate(context({ id: '42', role: UserType.PRESTADOR })),
      ).toBe(false);
    },
  );

  it('allows authenticated handlers without role metadata', () => {
    expect(
      guard.canActivate(context({ id: '42', role: UserType.CLIENTE })),
    ).toBe(true);
  });

  it('allows public routes before evaluating role metadata', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'isPublic' ? true : [UserType.PRESTADOR],
    );

    expect(guard.canActivate(context())).toBe(true);
  });
});
