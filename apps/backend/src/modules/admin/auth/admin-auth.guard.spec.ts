import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';

import { ADMIN_ACTOR_KEY, ADMIN_OPERATOR_KEY } from './admin-actor';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthTokenService } from './admin-auth-token.service';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let tokenService: { verify: jest.Mock };
  let authService: { validatePayload: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    tokenService = {
      verify: jest.fn().mockReturnValue({
        sub: '42',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    };
    authService = {
      validatePayload: jest.fn().mockResolvedValue({
        id: BigInt(42),
        name: 'Admin Operator',
        email: 'admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 3,
        activatedAt: new Date('2026-07-02T00:00:00.000Z'),
      }),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };
    guard = new AdminAuthGuard(
      tokenService as unknown as AdminAuthTokenService,
      authService as unknown as AdminAuthService,
      reflector as unknown as Reflector,
    );
  });

  function makeContext(headers: Record<string, string> = {}) {
    const request = { headers };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => 'handler',
        getClass: () => 'class',
      } as any,
    };
  }

  it('validates a bearer token and attaches the current operator', async () => {
    const { request, context } = makeContext({
      authorization: 'Bearer ADMIN_TOKEN',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(tokenService.verify).toHaveBeenCalledWith('ADMIN_TOKEN');
    expect(authService.validatePayload).toHaveBeenCalledWith({
      sub: '42',
      tokenKind: 'admin',
      role: AdminRole.ADMINISTRATOR,
      ver: 3,
    });
    expect(request[ADMIN_ACTOR_KEY]).toEqual(
      expect.objectContaining({
        id: BigInt(42),
        role: AdminRole.ADMINISTRATOR,
      }),
    );
    expect(request[ADMIN_OPERATOR_KEY]).toBe(request[ADMIN_ACTOR_KEY]);
  });

  it('skips token validation for administrative public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(tokenService.verify).not.toHaveBeenCalled();
    expect(authService.validatePayload).not.toHaveBeenCalled();
  });

  it('rejects requests without an authorization header', async () => {
    const { context } = makeContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed authorization headers', async () => {
    const { context } = makeContext({ authorization: 'Token ADMIN_TOKEN' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
