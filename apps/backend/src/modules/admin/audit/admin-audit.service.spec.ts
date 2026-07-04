import { BadRequestException } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

import { AdminActor } from '../auth/admin-actor';
import { AdminAuditAction } from './admin-audit.contracts';
import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  const actor: AdminActor = {
    id: BigInt(42),
    name: 'Admin Operator',
    email: 'admin@example.com',
    role: AdminRole.ADMINISTRATOR,
    active: true,
    tokenVersion: 7,
    activatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };

  function makeTx() {
    return {
      auditLog: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: BigInt(1),
          ...data,
          createdAt: new Date('2026-07-02T12:00:00.000Z'),
        })),
      },
    } as any;
  }

  function makePrisma(overrides: Record<string, any> = {}) {
    return {
      $transaction: jest.fn(async (operations) => Promise.all(operations)),
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        ...overrides,
      },
    } as any;
  }

  it.each([
    { passwordHash: 'hash' },
    { token: 'raw-token' },
    { invitationSecret: 'invite-secret' },
    { nested: { refreshToken: 'refresh-token' } },
  ])('rejects known secret fields from audit deltas', async (before) => {
    const service = new AdminAuditService(makePrisma());

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: BigInt(99) },
        before,
        requestId: 'req-secret',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects complete personal records while allowing minimal deltas', async () => {
    const service = new AdminAuditService(makePrisma());

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: BigInt(99) },
        before: {
          user: {
            name: 'Provider',
            email: 'provider@example.com',
          },
        },
        requestId: 'req-personal',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.AdminUserRoleChanged,
        target: { type: 'AdminUser', id: BigInt(43) },
        before: { role: AdminRole.SUPPORT },
        after: { role: AdminRole.ADMINISTRATOR },
        requestId: 'req-minimal',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        action: AdminAuditAction.AdminUserRoleChanged,
      }),
    );
  });

  it('preserves actor role and request ID as immutable snapshots', async () => {
    const service = new AdminAuditService(makePrisma());
    const tx = makeTx();

    await service.append(tx, {
      actor,
      action: AdminAuditAction.ProviderBlocked,
      target: { type: 'Provider', id: BigInt(99) },
      before: { status: 'APPROVED' },
      after: { status: 'BLOCKED' },
      reason: 'Policy violation',
      requestId: 'req-snapshot',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorAdminId: BigInt(42),
        actorRole: AdminRole.ADMINISTRATOR,
        requestId: 'req-snapshot',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    });
  });

  it('normalizes JSON-safe scalar, array, null, date, and bigint values', async () => {
    const service = new AdminAuditService(makePrisma());
    const tx = makeTx();

    await service.append(tx, {
      actor,
      action: AdminAuditAction.ProviderBlocked,
      target: { type: 'Provider', id: BigInt(99) },
      after: {
        status: 'BLOCKED',
        attempts: 1,
        automatic: false,
        reviewedAt: new Date('2026-07-02T12:00:00.000Z'),
        providerId: BigInt(99),
        notes: ['manual', null],
      },
      requestId: 'req-json',
    });

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        after: expect.objectContaining({
          reviewedAt: '2026-07-02T12:00:00.000Z',
          providerId: '99',
          notes: expect.any(Array),
        }),
      }),
    });
  });

  it('rejects missing required audit context', async () => {
    const service = new AdminAuditService(makePrisma());

    await expect(
      service.append(makeTx(), {
        actor: undefined as any,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: BigInt(99) },
        requestId: 'req-missing-actor',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: BigInt(99) },
        requestId: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: '', id: undefined as any },
        requestId: 'req-missing-target',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-JSON-safe values', async () => {
    const service = new AdminAuditService(makePrisma());

    await expect(
      service.append(makeTx(), {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: BigInt(99) },
        after: { statusFactory: () => 'APPROVED' },
        requestId: 'req-non-json',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not expose audit update or delete capabilities', () => {
    const service = new AdminAuditService(makePrisma()) as any;

    expect(service.update).toBeUndefined();
    expect(service.delete).toBeUndefined();
    expect(service.remove).toBeUndefined();
  });

  it('builds only explicitly supported audit filter predicates', () => {
    const service = new AdminAuditService(makePrisma());

    expect(
      service.buildWhere({
        operatorId: '42',
        action: AdminAuditAction.ProviderApproved,
        entityType: 'Provider',
        entityId: '99',
        requestId: 'req-filter',
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-02T00:00:00.000Z',
      }),
    ).toEqual({
      actorAdminId: BigInt(42),
      action: AdminAuditAction.ProviderApproved,
      entityType: 'Provider',
      entityId: '99',
      requestId: 'req-filter',
      createdAt: {
        gte: new Date('2026-07-01T00:00:00.000Z'),
        lte: new Date('2026-07-02T00:00:00.000Z'),
      },
    });

    expect(
      service.buildWhere({
        targetType: 'AdminUser',
        targetId: '7',
      }),
    ).toEqual({
      entityType: 'AdminUser',
      entityId: '7',
    });
  });

  it('enforces default and maximum audit query limits', () => {
    const service = new AdminAuditService(makePrisma());

    expect(service.getPageBounds({})).toEqual({ page: 1, limit: 25 });
    expect(service.getPageBounds({ page: -1, limit: 500 })).toEqual({
      page: 1,
      limit: 100,
    });
  });

  it('queries audit list with deterministic descending order and stable metadata', async () => {
    const prisma = makePrisma({
      count: jest.fn().mockResolvedValue(26),
      findMany: jest.fn().mockResolvedValue([
        {
          id: BigInt(2),
          actorAdminId: BigInt(42),
          actorRole: AdminRole.ADMINISTRATOR,
          action: AdminAuditAction.ProviderApproved,
          entityType: 'Provider',
          entityId: '99',
          before: null,
          after: null,
          reason: null,
          requestId: 'req-list',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date('2026-07-02T12:00:00.000Z'),
          actorAdmin: {
            id: BigInt(42),
            name: 'Former Admin',
            email: 'former@example.com',
            active: false,
          },
        },
      ]),
    });
    const service = new AdminAuditService(prisma);

    const page = await service.list({ page: 2, limit: 25 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 25,
        take: 25,
      }),
    );
    expect(page.meta).toEqual({
      total: 26,
      page: 2,
      limit: 25,
      totalPages: 2,
      hasPrevPage: true,
      hasNextPage: false,
    });
    expect(page.data[0].actor).toEqual({
      id: BigInt(42),
      role: AdminRole.ADMINISTRATOR,
      name: 'Former Admin',
      email: 'former@example.com',
      active: false,
    });
  });

  it('returns privacy-safe audit details without stored secret fields', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue({
        id: BigInt(10),
        actorAdminId: BigInt(42),
        actorRole: AdminRole.ADMINISTRATOR,
        action: AdminAuditAction.AdminUserRoleChanged,
        entityType: 'AdminUser',
        entityId: '77',
        before: {
          role: AdminRole.SUPPORT,
          passwordHash: 'SECRET',
          nested: { invitationToken: 'RAW_TOKEN', active: true },
        },
        after: { role: AdminRole.ADMINISTRATOR },
        reason: 'Role update',
        requestId: 'req-detail',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        createdAt: new Date('2026-07-02T13:00:00.000Z'),
        actorAdmin: {
          id: BigInt(42),
          name: 'Admin',
          email: 'admin@example.com',
          active: true,
        },
      }),
    });
    const service = new AdminAuditService(prisma);

    const detail = await service.getDetail('10');

    expect(prisma.auditLog.findUnique).toHaveBeenCalledWith({
      where: { id: BigInt(10) },
      select: expect.any(Object),
    });
    expect(detail.auditLog.before).not.toHaveProperty('passwordHash');
    expect((detail.auditLog.before as any).nested).not.toHaveProperty(
      'invitationToken',
    );
    expect(detail.auditLog.before).toEqual({
      role: AdminRole.SUPPORT,
      nested: { active: true },
    });
  });
});
