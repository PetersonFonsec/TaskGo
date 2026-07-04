import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  AdminRole,
  PrismaClient,
  ProviderStatus,
  UserType,
} from '@prisma/client';

import { AdminActor } from '../auth/admin-actor';
import { AdminAuditAction } from './admin-audit.contracts';
import { AdminAuditService } from './admin-audit.service';

const backendRoot = resolve(__dirname, '../../../..');

function readEnvDatabaseUrl() {
  const envPath = resolve(backendRoot, '.env.test');
  const envFile = readFileSync(envPath, 'utf8');
  const databaseUrl = envFile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith('DATABASE_URL='));

  if (!databaseUrl)
    throw new Error('DATABASE_URL not found in apps/backend/.env.test');

  return databaseUrl.slice('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
}

describe('AdminAuditService integration', () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: readEnvDatabaseUrl(),
      },
    },
  });
  const service = new AdminAuditService(prisma as any);
  const suffix = `${Date.now()}`;
  const adminEmail = `audit-admin-${suffix}@example.com`;
  const providerId = BigInt(`91${suffix.slice(-10)}`);
  const requestId = `audit-${suffix}`;
  let actor: AdminActor;

  beforeAll(async () => {
    await prisma.$connect();
    const admin = await prisma.adminUser.create({
      data: {
        name: 'Audit Admin',
        email: adminEmail,
        role: AdminRole.ADMINISTRATOR,
        active: true,
        tokenVersion: 1,
      },
    });
    actor = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      active: admin.active,
      tokenVersion: admin.tokenVersion,
      activatedAt: admin.activatedAt,
    };

    await prisma.user.create({
      data: {
        id: providerId,
        name: 'Audit Provider',
        email: `audit-provider-${suffix}@example.com`,
        passwordHash: 'hash',
        type: UserType.PRESTADOR,
        cpf: `91${suffix.slice(-9)}`,
        provider: {
          create: {
            status: ProviderStatus.PENDING,
            verified: false,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: {
        requestId: {
          startsWith: requestId,
        },
      },
    });
    await prisma.provider.deleteMany({ where: { id: providerId } });
    await prisma.user.deleteMany({ where: { id: providerId } });
    await prisma.adminUser.deleteMany({ where: { email: adminEmail } });
    await prisma.$disconnect();
  });

  it('inserts an attributable audit entry inside a caller-owned transaction', async () => {
    const audit = await prisma.$transaction((tx) =>
      service.append(tx, {
        actor,
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: providerId },
        before: { status: ProviderStatus.PENDING },
        after: { status: ProviderStatus.APPROVED },
        reason: null,
        requestId: `${requestId}-commit`,
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
      }),
    );

    expect(audit).toEqual(
      expect.objectContaining({
        actorAdminId: actor.id,
        actorRole: AdminRole.ADMINISTRATOR,
        action: AdminAuditAction.ProviderApproved,
        entityType: 'Provider',
        entityId: providerId.toString(),
        requestId: `${requestId}-commit`,
      }),
    );
  });

  it('rolls back associated state mutation when audit append fails', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.provider.update({
          where: { id: providerId },
          data: {
            status: ProviderStatus.APPROVED,
            verified: true,
          },
        });

        await service.append(tx, {
          actor,
          action: AdminAuditAction.ProviderApproved,
          target: { type: 'Provider', id: providerId },
          before: { status: ProviderStatus.PENDING },
          after: {
            status: ProviderStatus.APPROVED,
            invitationTokenHash: 'must-not-be-written',
          },
          requestId: `${requestId}-rollback`,
        });
      }),
    ).rejects.toThrow();

    const provider = await prisma.provider.findUniqueOrThrow({
      where: { id: providerId },
      select: { status: true, verified: true },
    });
    const rollbackAudit = await prisma.auditLog.findFirst({
      where: { requestId: `${requestId}-rollback` },
    });

    expect(provider).toEqual({
      status: ProviderStatus.PENDING,
      verified: false,
    });
    expect(rollbackAudit).toBeNull();
  });
});
