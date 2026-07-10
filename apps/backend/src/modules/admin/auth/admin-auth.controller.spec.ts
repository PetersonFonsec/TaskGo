import { AdminRole } from '@prisma/client';

import { AdminAuthController } from './admin-auth.controller';
import { ADMIN_ACTOR_KEY } from './admin-actor';
import { AdminAuthService } from './admin-auth.service';
import type { AdminAuthSession, AdminMeResponse } from '@taskgo/shared';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let authService: {
    changePassword: jest.Mock;
    login: jest.Mock;
    toResponse: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      changePassword: jest.fn().mockResolvedValue({ operator: { id: '42' } }),
      login: jest.fn().mockResolvedValue({
        access_token: 'TOKEN',
        operator: {
          id: '42',
          name: 'Admin Operator',
          email: 'admin@example.com',
          role: AdminRole.ADMINISTRATOR,
          active: true,
          activatedAt: '2026-07-02T00:00:00.000Z',
        },
      }),
      toResponse: jest.fn().mockReturnValue({
        id: '42',
        name: 'Admin Operator',
        email: 'admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
        activatedAt: '2026-07-02T00:00:00.000Z',
      }),
    };
    controller = new AdminAuthController(
      authService as unknown as AdminAuthService,
    );
  });

  it('delegates login to the admin auth service', async () => {
    const result: AdminAuthSession = await controller.login({
      email: 'admin@example.com',
      password: 'password',
    });

    expect(result).toEqual({
      access_token: 'TOKEN',
      operator: {
        id: '42',
        name: 'Admin Operator',
        email: 'admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
        activatedAt: '2026-07-02T00:00:00.000Z',
      },
    });

    expect(authService.login).toHaveBeenCalledWith(
      'admin@example.com',
      'password',
    );
  });

  it('returns a sanitized current operator response', () => {
    const operator = { id: BigInt(42), role: AdminRole.ADMINISTRATOR };
    const result: AdminMeResponse = controller.me({
      [ADMIN_ACTOR_KEY]: operator,
    } as any);

    expect(result).toEqual({
      operator: {
        id: '42',
        name: 'Admin Operator',
        email: 'admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
        activatedAt: '2026-07-02T00:00:00.000Z',
      },
    });
    expect(authService.toResponse).toHaveBeenCalledWith(operator);
  });

  it('delegates password changes with the current actor', async () => {
    const operator = { id: BigInt(42), role: AdminRole.ADMINISTRATOR };
    const body = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    };

    await expect(
      controller.changePassword(body, {
        [ADMIN_ACTOR_KEY]: operator,
        headers: {},
      } as any),
    ).resolves.toEqual({ operator: { id: '42' } });

    expect(authService.changePassword).toHaveBeenCalledWith(
      operator,
      body,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });
});
