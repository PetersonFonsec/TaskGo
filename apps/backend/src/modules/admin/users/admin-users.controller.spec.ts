import { AdminRole } from '@prisma/client';

import { ADMIN_ACTOR_KEY } from '../auth/admin-actor';
import { AdminInvitationActivationController } from './admin-invitation-activation.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let service: {
    changeRole: jest.Mock;
    deactivate: jest.Mock;
    invite: jest.Mock;
    list: jest.Mock;
    reactivate: jest.Mock;
  };
  const actor = { id: BigInt(1), role: AdminRole.ADMINISTRATOR };

  beforeEach(() => {
    service = {
      changeRole: jest.fn().mockResolvedValue({ operator: { id: '2' } }),
      deactivate: jest.fn().mockResolvedValue({ operator: { id: '2' } }),
      invite: jest.fn().mockResolvedValue({ operator: { id: '2' } }),
      list: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
      reactivate: jest.fn().mockResolvedValue({ operator: { id: '2' } }),
    };
    controller = new AdminUsersController(
      service as unknown as AdminUsersService,
    );
  });

  it('delegates listing with query parameters', async () => {
    const query = { page: 2, limit: 10, role: AdminRole.SUPPORT };

    await expect(controller.list(query)).resolves.toEqual({
      data: [],
      meta: { total: 0 },
    });
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('delegates invitation creation with actor and request context', async () => {
    const body = {
      name: 'Support',
      email: 'support@example.com',
      role: AdminRole.SUPPORT,
    };

    await controller.invite(body, {
      [ADMIN_ACTOR_KEY]: actor,
      headers: {},
    } as any);

    expect(service.invite).toHaveBeenCalledWith(
      body,
      actor,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('delegates role changes', async () => {
    await controller.changeRole(
      2,
      { role: AdminRole.FINANCE },
      { [ADMIN_ACTOR_KEY]: actor, headers: {} } as any,
    );

    expect(service.changeRole).toHaveBeenCalledWith(
      BigInt(2),
      AdminRole.FINANCE,
      actor,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });

  it('delegates activation and deactivation', async () => {
    const request = { [ADMIN_ACTOR_KEY]: actor, headers: {} } as any;

    await controller.activate(2, request);
    await controller.deactivate(2, request);

    expect(service.reactivate).toHaveBeenCalledWith(
      BigInt(2),
      actor,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
    expect(service.deactivate).toHaveBeenCalledWith(
      BigInt(2),
      actor,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });
});

describe('AdminInvitationActivationController', () => {
  it('delegates public invitation activation with request context', async () => {
    const service = {
      activateInvitation: jest.fn().mockResolvedValue({ operator: { id: '2' } }),
    };
    const controller = new AdminInvitationActivationController(
      service as unknown as AdminUsersService,
    );
    const body = { token: 'token', password: 'new-password' };

    await expect(
      controller.activate(body, { headers: {} } as any),
    ).resolves.toEqual({ operator: { id: '2' } });
    expect(service.activateInvitation).toHaveBeenCalledWith(
      body,
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });
});
