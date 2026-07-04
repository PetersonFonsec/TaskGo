import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AdminAuditAction } from '../../src/modules/admin/audit/admin-audit.contracts';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Admin audit logs E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  const suffix = Date.now();
  let sequence = 0;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    await cleanup();
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    if (app) await app.close();
  });

  async function cleanup() {
    const adminIds = await prisma.adminUser.findMany({
      where: { email: { contains: `task09.${suffix}` } },
      select: { id: true },
    });

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { requestId: { startsWith: `task09-${suffix}` } },
          { actorAdminId: { in: adminIds.map((admin) => admin.id) } },
        ],
      },
    });
    await prisma.adminUser.deleteMany({
      where: { email: { contains: `task09.${suffix}` } },
    });
  }

  async function createOperator(role: AdminRole, active = true) {
    sequence += 1;
    return prisma.adminUser.create({
      data: {
        name: `Task 09 ${role}`,
        email: `task09.${suffix}.${sequence}.${role.toLowerCase()}@example.com`,
        passwordHash: 'HASH',
        role,
        active,
        tokenVersion: 1,
        activatedAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    });
  }

  function adminToken(operator: {
    id: bigint;
    role: AdminRole;
    tokenVersion: number;
  }) {
    return jwtService.sign({
      sub: operator.id.toString(),
      tokenKind: 'admin',
      role: operator.role,
      ver: operator.tokenVersion,
    });
  }

  async function createAuditLog(input: {
    actorAdminId: bigint;
    actorRole: AdminRole;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
    requestId: string;
  }) {
    return prisma.auditLog.create({
      data: {
        actorAdminId: input.actorAdminId,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: { status: 'PENDING', passwordHash: 'must-not-leak' },
        after: { status: 'APPROVED', nested: { rawToken: 'must-not-leak' } },
        reason: 'Investigation fixture',
        requestId: input.requestId,
        ipAddress: '127.0.0.1',
        userAgent: 'supertest',
        createdAt: input.createdAt,
      },
    });
  }

  it('returns exact matches for combined operator, action, entity, and date filters', async () => {
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const otherAdmin = await createOperator(AdminRole.ADMINISTRATOR);
    const authorization = `Bearer ${adminToken(admin)}`;
    const expected = await createAuditLog({
      actorAdminId: admin.id,
      actorRole: admin.role,
      action: AdminAuditAction.ProviderApproved,
      entityType: 'Provider',
      entityId: '9001',
      createdAt: new Date('2026-07-02T12:00:00.000Z'),
      requestId: `task09-${suffix}-expected`,
    });
    await createAuditLog({
      actorAdminId: otherAdmin.id,
      actorRole: otherAdmin.role,
      action: AdminAuditAction.ProviderApproved,
      entityType: 'Provider',
      entityId: '9001',
      createdAt: new Date('2026-07-02T12:05:00.000Z'),
      requestId: `task09-${suffix}-other-actor`,
    });
    await createAuditLog({
      actorAdminId: admin.id,
      actorRole: admin.role,
      action: AdminAuditAction.ProviderRejected,
      entityType: 'Provider',
      entityId: '9001',
      createdAt: new Date('2026-07-02T12:10:00.000Z'),
      requestId: `task09-${suffix}-other-action`,
    });

    const response = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .query({
        operatorId: admin.id.toString(),
        action: AdminAuditAction.ProviderApproved,
        entityType: 'Provider',
        entityId: '9001',
        from: '2026-07-02T11:59:00.000Z',
        to: '2026-07-02T12:01:00.000Z',
      })
      .set('Authorization', authorization)
      .expect(200);

    expect(response.body.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 25, total: 1 }),
    );
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: expected.id.toString(),
        action: AdminAuditAction.ProviderApproved,
        target: { type: 'Provider', id: '9001' },
        actor: expect.objectContaining({
          id: admin.id.toString(),
          role: AdminRole.ADMINISTRATOR,
        }),
      }),
    ]);
  });

  it('returns detail with actor snapshot after deactivation and no secret fields', async () => {
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const audit = await createAuditLog({
      actorAdminId: admin.id,
      actorRole: admin.role,
      action: AdminAuditAction.AdminUserRoleChanged,
      entityType: 'AdminUser',
      entityId: '77',
      createdAt: new Date('2026-07-02T13:00:00.000Z'),
      requestId: `task09-${suffix}-detail`,
    });
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { active: false },
    });
    const activeAdmin = await createOperator(AdminRole.ADMINISTRATOR);

    const response = await request(app.getHttpServer())
      .get(`/admin/audit-logs/${audit.id.toString()}`)
      .set('Authorization', `Bearer ${adminToken(activeAdmin)}`)
      .expect(200);

    expect(response.body.auditLog.actor).toEqual(
      expect.objectContaining({
        id: admin.id.toString(),
        role: AdminRole.ADMINISTRATOR,
        active: false,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('rawToken');
  });

  it('allows only Administrators to read audit logs', async () => {
    const operators = {
      [AdminRole.ADMINISTRATOR]: await createOperator(AdminRole.ADMINISTRATOR),
      [AdminRole.SUPPORT]: await createOperator(AdminRole.SUPPORT),
      [AdminRole.FINANCE]: await createOperator(AdminRole.FINANCE),
      [AdminRole.MODERATOR]: await createOperator(AdminRole.MODERATOR),
    };

    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set(
        'Authorization',
        `Bearer ${adminToken(operators[AdminRole.ADMINISTRATOR])}`,
      )
      .expect(200);

    for (const role of [
      AdminRole.SUPPORT,
      AdminRole.FINANCE,
      AdminRole.MODERATOR,
    ]) {
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken(operators[role])}`)
        .expect(403);
    }
  });

  it('does not expose audit mutation routes', async () => {
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const authorization = `Bearer ${adminToken(admin)}`;

    await request(app.getHttpServer())
      .put('/admin/audit-logs/1')
      .set('Authorization', authorization)
      .send({ reason: 'forbidden' })
      .expect(404);
    await request(app.getHttpServer())
      .patch('/admin/audit-logs/1')
      .set('Authorization', authorization)
      .send({ reason: 'forbidden' })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/admin/audit-logs/1')
      .set('Authorization', authorization)
      .expect(404);
  });

  it('serves a representative bounded search within the 500 ms p95 target', async () => {
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        createAuditLog({
          actorAdminId: admin.id,
          actorRole: admin.role,
          action: AdminAuditAction.ProviderBlocked,
          entityType: 'Provider',
          entityId: `perf-${index}`,
          createdAt: new Date(
            `2026-07-02T14:${String(index).padStart(2, '0')}:00.000Z`,
          ),
          requestId: `task09-${suffix}-perf-${index}`,
        }),
      ),
    );
    const authorization = `Bearer ${adminToken(admin)}`;
    const durations: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      const startedAt = performance.now();
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .query({
          operatorId: admin.id.toString(),
          action: AdminAuditAction.ProviderBlocked,
          from: '2026-07-02T14:00:00.000Z',
          to: '2026-07-02T14:59:59.999Z',
          limit: 25,
        })
        .set('Authorization', authorization)
        .expect(200);
      durations.push(performance.now() - startedAt);
    }

    const p95 = durations.sort((a, b) => a - b)[
      Math.ceil(durations.length * 0.95) - 1
    ];
    expect(p95).toBeLessThan(500);
  });
});
