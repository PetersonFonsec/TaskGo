import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminUsersService } from './admin-users.service';
import { AdminInvitationDeliveryService } from './invitations/admin-invitation-delivery.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: any;
  let audit: { append: jest.Mock };
  let delivery: { deliver: jest.Mock };

  const actor = {
    id: BigInt(1),
    name: 'Root Admin',
    email: 'root@example.com',
    role: AdminRole.ADMINISTRATOR,
    active: true,
    tokenVersion: 1,
    activatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };
  const requestContext = {
    requestId: 'req-1',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  };
  const invitedOperator = {
    id: BigInt(2),
    name: 'Support Operator',
    email: 'support@example.com',
    passwordHash: null,
    role: AdminRole.SUPPORT,
    active: false,
    tokenVersion: 0,
    invitationTokenHash: 'HASH',
    invitationExpiresAt: new Date(Date.now() + 60_000),
    activatedAt: null,
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    audit = { append: jest.fn().mockResolvedValue({ id: BigInt(1) }) };
    delivery = { deliver: jest.fn().mockResolvedValue(undefined) };

    prisma = {
      $transaction: jest.fn(async (arg: any) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg(prisma);
      }),
      adminUser: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    service = new AdminUsersService(
      prisma as PrismaService,
      audit as unknown as AdminAuditService,
      delivery as unknown as AdminInvitationDeliveryService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects expired invitation tokens', async () => {
    prisma.adminUser.findFirst.mockResolvedValue({
      ...invitedOperator,
      invitationExpiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      service.activateInvitation(
        { token: 'expired-token', password: 'new-password' },
        requestContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reused invitation tokens', async () => {
    prisma.adminUser.findFirst.mockResolvedValue({
      ...invitedOperator,
      passwordHash: 'HASHED',
      active: true,
      activatedAt: new Date('2026-07-02T01:00:00.000Z'),
    });

    await expect(
      service.activateInvitation(
        { token: 'used-token', password: 'new-password' },
        requestContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects superseded invitation tokens', async () => {
    prisma.adminUser.findFirst.mockResolvedValue(null);

    await expect(
      service.activateInvitation(
        { token: 'old-token', password: 'new-password' },
        requestContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('increments tokenVersion and clears invitation state on activation', async () => {
    prisma.adminUser.findFirst.mockResolvedValue(invitedOperator);
    prisma.adminUser.updateMany.mockResolvedValue({ count: 1 });
    prisma.adminUser.findUniqueOrThrow.mockResolvedValue({
      ...invitedOperator,
      passwordHash: 'HASHED_PASSWORD',
      active: true,
      tokenVersion: 1,
      invitationTokenHash: null,
      invitationExpiresAt: null,
      activatedAt: new Date('2026-07-02T01:00:00.000Z'),
    });

    await service.activateInvitation(
      { token: 'valid-token', password: 'new-password' },
      requestContext,
    );

    expect(prisma.adminUser.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: invitedOperator.id,
        active: false,
        passwordHash: null,
        activatedAt: null,
      }),
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        active: true,
        invitationTokenHash: null,
        invitationExpiresAt: null,
        tokenVersion: { increment: 1 },
      }),
    });
    expect(audit.append).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'ADMIN_USER_ACTIVATED',
        target: { type: 'AdminUser', id: invitedOperator.id },
      }),
    );
  });

  it('increments tokenVersion on role changes', async () => {
    const operator = {
      ...invitedOperator,
      active: true,
      role: AdminRole.SUPPORT,
      activatedAt: new Date('2026-07-02T01:00:00.000Z'),
    };
    prisma.adminUser.findUnique.mockResolvedValue(operator);
    prisma.adminUser.update.mockResolvedValue({
      ...operator,
      role: AdminRole.FINANCE,
      tokenVersion: 1,
    });

    await service.changeRole(
      operator.id,
      AdminRole.FINANCE,
      actor,
      requestContext,
    );

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: operator.id },
      data: { role: AdminRole.FINANCE, tokenVersion: { increment: 1 } },
    });
  });

  it('increments tokenVersion on deactivation', async () => {
    const operator = {
      ...invitedOperator,
      active: true,
      role: AdminRole.SUPPORT,
      activatedAt: new Date('2026-07-02T01:00:00.000Z'),
    };
    prisma.adminUser.findUnique.mockResolvedValue(operator);
    prisma.adminUser.update.mockResolvedValue({
      ...operator,
      active: false,
      tokenVersion: 1,
    });

    await service.deactivate(operator.id, actor, requestContext);

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: operator.id },
      data: { active: false, tokenVersion: { increment: 1 } },
    });
  });

  it('prevents deactivation of the final active Administrator', async () => {
    const operator = {
      ...invitedOperator,
      id: BigInt(1),
      active: true,
      role: AdminRole.ADMINISTRATOR,
      activatedAt: new Date('2026-07-02T01:00:00.000Z'),
    };
    prisma.adminUser.findUnique.mockResolvedValue(operator);
    prisma.adminUser.count.mockResolvedValue(1);

    await expect(
      service.deactivate(operator.id, actor, requestContext),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.adminUser.update).not.toHaveBeenCalled();
  });
});
