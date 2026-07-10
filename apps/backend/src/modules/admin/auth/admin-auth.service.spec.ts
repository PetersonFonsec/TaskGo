import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminAuthTokenService } from './admin-auth-token.service';
import { AdminAuthService } from './admin-auth.service';
import type { AdminAuthSession, AdminOperatorProfile } from '@taskgo/shared';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: {
    $transaction: jest.Mock;
    adminUser: { findUnique: jest.Mock; update: jest.Mock };
  };
  let tokenService: { createToken: jest.Mock };
  let audit: { append: jest.Mock };

  const activeOperator = {
    id: BigInt(42),
    name: 'Admin Operator',
    email: 'admin@example.com',
    passwordHash: 'HASH',
    role: AdminRole.ADMINISTRATOR,
    active: true,
    tokenVersion: 3,
    invitationTokenHash: 'SECRET',
    invitationExpiresAt: new Date('2026-07-03T00:00:00.000Z'),
    activatedAt: new Date('2026-07-02T00:00:00.000Z'),
    createdAt: new Date('2026-07-02T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (callback) => callback(prisma)),
      adminUser: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    tokenService = {
      createToken: jest.fn().mockReturnValue({ access_token: 'ADMIN_TOKEN' }),
    };
    audit = { append: jest.fn().mockResolvedValue({ id: BigInt(1) }) };
    service = new AdminAuthService(
      prisma as unknown as PrismaService,
      tokenService as unknown as AdminAuthTokenService,
      audit as unknown as AdminAuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns access_token and a shared admin operator shape for a valid active operator', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      passwordHash: await bcrypt.hash('correct-password', 10),
    });

    const result: AdminAuthSession = await service.login(
      'ADMIN@EXAMPLE.COM',
      'correct-password',
    );

    expect(result).toEqual({
      operator: {
        id: '42',
        name: 'Admin Operator',
        email: 'admin@example.com',
        role: AdminRole.ADMINISTRATOR,
        active: true,
        activatedAt: '2026-07-02T00:00:00.000Z',
      },
      access_token: 'ADMIN_TOKEN',
    });

    expect(prisma.adminUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    });
    expect(tokenService.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        id: BigInt(42),
        role: AdminRole.ADMINISTRATOR,
        tokenVersion: 3,
      }),
    );
  });

  it('serializes operator id and activated timestamp as JSON-safe values', () => {
    const result: AdminOperatorProfile = service.toResponse(activeOperator);

    expect(result).toEqual({
      id: '42',
      name: 'Admin Operator',
      email: 'admin@example.com',
      role: AdminRole.ADMINISTRATOR,
      active: true,
      activatedAt: '2026-07-02T00:00:00.000Z',
    });
  });

  it('rejects wrong passwords without issuing a token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      passwordHash: await bcrypt.hash('correct-password', 10),
    });

    await expect(
      service.login('admin@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tokenService.createToken).not.toHaveBeenCalled();
  });

  it('rejects inactive operators without issuing a token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      active: false,
    });

    await expect(
      service.login('admin@example.com', 'correct-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tokenService.createToken).not.toHaveBeenCalled();
  });

  it('rejects operators without a password without issuing a token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      passwordHash: null,
    });

    await expect(
      service.login('admin@example.com', 'correct-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tokenService.createToken).not.toHaveBeenCalled();
  });

  it('rejects unactivated operators without issuing a token', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      activatedAt: null,
    });

    await expect(
      service.login('admin@example.com', 'correct-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tokenService.createToken).not.toHaveBeenCalled();
  });

  it('validates an active operator payload', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(activeOperator);

    await expect(
      service.validatePayload({
        sub: '42',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    ).resolves.toBe(activeOperator);
  });

  it('rejects invalid token subjects', async () => {
    await expect(
      service.validatePayload({
        sub: 'not-a-bigint',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token versions that no longer match storage', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(activeOperator);

    await expect(
      service.validatePayload({
        sub: '42',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 2,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects token roles that no longer match storage', async () => {
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      role: AdminRole.SUPPORT,
    });

    await expect(
      service.validatePayload({
        sub: '42',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects missing administrative operators', async () => {
    prisma.adminUser.findUnique.mockResolvedValue(null);

    await expect(
      service.validatePayload({
        sub: '42',
        tokenKind: 'admin',
        role: AdminRole.ADMINISTRATOR,
        ver: 3,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changes passwords atomically and increments tokenVersion', async () => {
    const passwordHash = await bcrypt.hash('current-password', 10);
    prisma.adminUser.findUnique.mockResolvedValue({
      ...activeOperator,
      passwordHash,
    });
    prisma.adminUser.update.mockResolvedValue({
      ...activeOperator,
      passwordHash: 'NEW_HASH',
      tokenVersion: 4,
    });

    await service.changePassword(
      activeOperator,
      {
        currentPassword: 'current-password',
        newPassword: 'new-password',
      },
      {
        requestId: 'req-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(prisma.adminUser.update).toHaveBeenCalledWith({
      where: { id: activeOperator.id },
      data: {
        passwordHash: expect.any(String),
        tokenVersion: { increment: 1 },
      },
    });
    expect(audit.append).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'ADMIN_USER_PASSWORD_CHANGED',
        before: { sessionVersion: 3 },
        after: { sessionVersion: 4 },
      }),
    );
  });
});
