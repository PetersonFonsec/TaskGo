import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  AdminRole,
  ProviderDecisionAction,
  ProviderStatus,
  ServiceStatus,
  UserType,
} from '@prisma/client';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AdminAuditService } from '../../src/modules/admin/audit/admin-audit.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Admin providers reads E2E', () => {
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
    const providers = await prisma.user.findMany({
      where: { email: { contains: `task06.provider.${suffix}` } },
      select: { id: true },
    });
    const providerIds = providers.map((provider) => provider.id);
    const adminIds = await prisma.adminUser.findMany({
      where: { email: { contains: `${suffix}` } },
      select: { id: true },
    });

    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityType: 'Provider', entityId: { in: providerIds.map(String) } },
          { actorAdminId: { in: adminIds.map((admin) => admin.id) } },
        ],
      },
    });
    await prisma.providerDecision.deleteMany({
      where: {
        OR: [
          { providerId: { in: providerIds } },
          { actorAdminId: { in: adminIds.map((admin) => admin.id) } },
        ],
      },
    });
    await prisma.service.deleteMany({
      where: { providerId: { in: providerIds } },
    });
    await prisma.provider.deleteMany({
      where: { id: { in: providerIds } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: `task06.provider.${suffix}` } },
    });
    await prisma.adminUser.deleteMany({
      where: { email: { contains: `${suffix}` } },
    });
  }

  async function createOperator(role: AdminRole, active = true) {
    sequence += 1;
    return prisma.adminUser.create({
      data: {
        name: `Task 06 ${role}`,
        email: `task06.${role.toLowerCase()}.${suffix}.${sequence}@example.com`,
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

  async function createProvider(
    status: ProviderStatus = ProviderStatus.PENDING,
    createdAt = new Date('2026-07-01T00:00:00.000Z'),
  ) {
    sequence += 1;
    const email = `task06.provider.${suffix}.${sequence}@example.com`;
    const user = await prisma.user.create({
      data: {
        name: 'Task 06 Provider',
        email,
        passwordHash: 'USER_PASSWORD_HASH',
        phone: '11999999999',
        emailVerified: true,
        phoneVerified: true,
        type: UserType.PRESTADOR,
        cpf: `${suffix}${sequence}`.padStart(11, '0').slice(-11),
      },
    });

    await prisma.provider.create({
      data: {
        id: user.id,
        bio: 'Provider under backoffice review',
        verified: status === ProviderStatus.APPROVED,
        status,
        statusChangedAt: createdAt,
        createdAt,
      },
    });

    await prisma.service.create({
      data: {
        providerId: user.id,
        title: 'Task 06 Service',
        description: 'Administrative provider-read fixture',
        category: 'eletrica',
        basePrice: 100,
        status: ServiceStatus.ATIVO,
      },
    });

    return { id: user.id, email };
  }

  async function expectDecisionAndAuditCounts(
    providerId: bigint,
    expectedCount: number,
  ) {
    await expect(
      prisma.providerDecision.count({ where: { providerId } }),
    ).resolves.toBe(expectedCount);
    await expect(
      prisma.auditLog.count({
        where: { entityType: 'Provider', entityId: providerId.toString() },
      }),
    ).resolves.toBe(expectedCount);
  }

  it('allows Administrator and Support to read provider queue and details, while Finance and Moderator receive 403', async () => {
    const provider = await createProvider();
    const operators = {
      [AdminRole.ADMINISTRATOR]: await createOperator(AdminRole.ADMINISTRATOR),
      [AdminRole.SUPPORT]: await createOperator(AdminRole.SUPPORT),
      [AdminRole.FINANCE]: await createOperator(AdminRole.FINANCE),
      [AdminRole.MODERATOR]: await createOperator(AdminRole.MODERATOR),
    };

    for (const role of [AdminRole.ADMINISTRATOR, AdminRole.SUPPORT]) {
      const authorization = `Bearer ${adminToken(operators[role])}`;
      const queueResponse = await request(app.getHttpServer())
        .get('/admin/providers')
        .query({
          status: ProviderStatus.PENDING,
          submittedFrom: '2026-07-01T00:00:00.000Z',
          limit: 100,
        })
        .set('Authorization', authorization)
        .expect(200);

      expect(queueResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: provider.id.toString(),
            status: expect.objectContaining({
              current: ProviderStatus.PENDING,
            }),
          }),
        ]),
      );
      expect(queueResponse.body.meta.limit).toBe(100);

      const detailResponse = await request(app.getHttpServer())
        .get(`/admin/providers/${provider.id.toString()}`)
        .set('Authorization', authorization)
        .expect(200);

      expect(detailResponse.body.provider.identity.email).toBe(provider.email);
      expect(JSON.stringify(detailResponse.body)).not.toContain('passwordHash');
      expect(JSON.stringify(detailResponse.body)).not.toContain(
        'rawProviderResponse',
      );
    }

    for (const role of [AdminRole.FINANCE, AdminRole.MODERATOR]) {
      await request(app.getHttpServer())
        .get('/admin/providers')
        .set('Authorization', `Bearer ${adminToken(operators[role])}`)
        .expect(403);
    }
  });

  it('returns chronological history and preserves deactivated actor identity', async () => {
    const provider = await createProvider();
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const formerAdmin = await createOperator(AdminRole.ADMINISTRATOR, false);

    await prisma.providerDecision.createMany({
      data: [
        {
          providerId: provider.id,
          action: ProviderDecisionAction.APPROVE,
          fromStatus: ProviderStatus.PENDING,
          toStatus: ProviderStatus.APPROVED,
          actorAdminId: formerAdmin.id,
          actorRole: formerAdmin.role,
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
        },
        {
          providerId: provider.id,
          action: ProviderDecisionAction.BLOCK,
          fromStatus: ProviderStatus.APPROVED,
          toStatus: ProviderStatus.BLOCKED,
          reason: 'Operational risk',
          actorAdminId: formerAdmin.id,
          actorRole: formerAdmin.role,
          createdAt: new Date('2026-07-01T11:00:00.000Z'),
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get(`/admin/providers/${provider.id.toString()}/history`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .expect(200);

    expect(response.body.data.map((item: any) => item.action)).toEqual([
      ProviderDecisionAction.APPROVE,
      ProviderDecisionAction.BLOCK,
    ]);
    expect(response.body.data[0].actor).toEqual(
      expect.objectContaining({
        id: formerAdmin.id.toString(),
        name: formerAdmin.name,
        email: formerAdmin.email,
        active: false,
      }),
    );
  });

  it('returns 404 for missing provider detail and history reads', async () => {
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const authorization = `Bearer ${adminToken(admin)}`;

    await request(app.getHttpServer())
      .get('/admin/providers/999999999')
      .set('Authorization', authorization)
      .expect(404);

    await request(app.getHttpServer())
      .get('/admin/providers/999999999/history')
      .set('Authorization', authorization)
      .expect(404);
  });

  it('executes provider lifecycle commands with status, compatibility, decision, and audit records', async () => {
    const approveProvider = await createProvider();
    const rejectProvider = await createProvider();
    const blockProvider = await createProvider(ProviderStatus.APPROVED);
    const unblockProvider = await createProvider(ProviderStatus.BLOCKED);
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const authorization = `Bearer ${adminToken(admin)}`;

    const approveResponse = await request(app.getHttpServer())
      .post(`/admin/providers/${approveProvider.id.toString()}/approve`)
      .set('Authorization', authorization)
      .expect(200);
    expect(approveResponse.body.provider.status.current).toBe(
      ProviderStatus.APPROVED,
    );
    expect(approveResponse.body.provider.verification.providerVerified).toBe(
      true,
    );

    await request(app.getHttpServer())
      .post(`/admin/providers/${rejectProvider.id.toString()}/reject`)
      .set('Authorization', authorization)
      .send({ reason: 'Missing required document' })
      .expect(200)
      .expect((response) => {
        expect(response.body.provider.status.current).toBe(
          ProviderStatus.REJECTED,
        );
        expect(response.body.provider.verification.providerVerified).toBe(
          false,
        );
      });

    await request(app.getHttpServer())
      .post(`/admin/providers/${blockProvider.id.toString()}/block`)
      .set('Authorization', authorization)
      .send({ reason: 'Operational risk' })
      .expect(200)
      .expect((response) => {
        expect(response.body.provider.status.current).toBe(
          ProviderStatus.BLOCKED,
        );
        expect(response.body.provider.verification.providerVerified).toBe(
          false,
        );
      });

    await request(app.getHttpServer())
      .post(`/admin/providers/${unblockProvider.id.toString()}/unblock`)
      .set('Authorization', authorization)
      .send({ reason: 'Review cleared' })
      .expect(200)
      .expect((response) => {
        expect(response.body.provider.status.current).toBe(
          ProviderStatus.APPROVED,
        );
        expect(response.body.provider.verification.providerVerified).toBe(true);
      });

    await expectDecisionAndAuditCounts(approveProvider.id, 1);
    await expectDecisionAndAuditCounts(rejectProvider.id, 1);
    await expectDecisionAndAuditCounts(blockProvider.id, 1);
    await expectDecisionAndAuditCounts(unblockProvider.id, 1);
  });

  it('returns bounded provider dashboard metrics and stays below the MVP threshold for a representative dataset', async () => {
    await cleanup();

    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const support = await createOperator(AdminRole.SUPPORT);
    const finance = await createOperator(AdminRole.FINANCE);
    const moderator = await createOperator(AdminRole.MODERATOR);

    await createProvider(
      ProviderStatus.PENDING,
      new Date('2026-08-02T08:00:00.000Z'),
    );
    const approvedProvider = await createProvider(
      ProviderStatus.APPROVED,
      new Date('2026-08-01T08:00:00.000Z'),
    );
    const rejectedProvider = await createProvider(
      ProviderStatus.REJECTED,
      new Date('2026-08-01T12:00:00.000Z'),
    );
    const blockedProvider = await createProvider(
      ProviderStatus.BLOCKED,
      new Date('2026-08-01T09:00:00.000Z'),
    );
    const unblockedProvider = await createProvider(
      ProviderStatus.APPROVED,
      new Date('2026-08-01T10:00:00.000Z'),
    );
    const outsideProvider = await createProvider(
      ProviderStatus.APPROVED,
      new Date('2026-05-01T10:00:00.000Z'),
    );

    await prisma.providerDecision.createMany({
      data: [
        {
          providerId: approvedProvider.id,
          action: ProviderDecisionAction.APPROVE,
          fromStatus: ProviderStatus.PENDING,
          toStatus: ProviderStatus.APPROVED,
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-08-02T08:00:00.000Z'),
        },
        {
          providerId: rejectedProvider.id,
          action: ProviderDecisionAction.REJECT,
          fromStatus: ProviderStatus.PENDING,
          toStatus: ProviderStatus.REJECTED,
          reason: 'Missing document',
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-08-02T00:00:00.000Z'),
        },
        {
          providerId: blockedProvider.id,
          action: ProviderDecisionAction.BLOCK,
          fromStatus: ProviderStatus.APPROVED,
          toStatus: ProviderStatus.BLOCKED,
          reason: 'Operational risk',
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-08-02T09:00:00.000Z'),
        },
        {
          providerId: unblockedProvider.id,
          action: ProviderDecisionAction.UNBLOCK,
          fromStatus: ProviderStatus.BLOCKED,
          toStatus: ProviderStatus.APPROVED,
          reason: 'Review cleared',
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-08-02T10:00:00.000Z'),
        },
        {
          providerId: outsideProvider.id,
          action: ProviderDecisionAction.APPROVE,
          fromStatus: ProviderStatus.PENDING,
          toStatus: ProviderStatus.APPROVED,
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-05-02T10:00:00.000Z'),
        },
      ],
    });

    for (let index = 0; index < 60; index += 1) {
      const provider = await createProvider(
        index % 2 === 0 ? ProviderStatus.APPROVED : ProviderStatus.REJECTED,
        new Date('2026-08-01T00:00:00.000Z'),
      );
      await prisma.providerDecision.create({
        data: {
          providerId: provider.id,
          action:
            index % 2 === 0
              ? ProviderDecisionAction.APPROVE
              : ProviderDecisionAction.REJECT,
          fromStatus: ProviderStatus.PENDING,
          toStatus:
            index % 2 === 0 ? ProviderStatus.APPROVED : ProviderStatus.REJECTED,
          reason: index % 2 === 0 ? null : 'Representative dataset',
          actorAdminId: admin.id,
          actorRole: admin.role,
          createdAt: new Date('2026-08-02T12:00:00.000Z'),
        },
      });
    }

    const startedAt = performance.now();
    const response = await request(app.getHttpServer())
      .get('/admin/dashboard/providers')
      .query({
        from: '2026-08-02T00:00:00.000Z',
        to: '2026-08-03T00:00:00.000Z',
      })
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .expect(200);
    const durationMs = performance.now() - startedAt;

    expect(response.body.period).toEqual(
      expect.objectContaining({
        from: '2026-08-02T00:00:00.000Z',
        to: '2026-08-03T00:00:00.000Z',
        defaultDays: 30,
        maxDays: 90,
      }),
    );
    expect(response.body.queue.pending).toBe(1);
    expect(response.body.decisions).toEqual({
      approve: 31,
      reject: 31,
      block: 1,
      unblock: 1,
      total: 64,
    });
    expect(response.body.reviewDuration).toEqual({
      averageMs: 127_509_677,
      averageHours: 35.419354722222225,
      reviewedProviders: 62,
    });
    expect(response.body.recentSensitiveActions).toHaveLength(10);
    expect(response.body.recentSensitiveActions[0]).toEqual(
      expect.objectContaining({
        action: expect.any(String),
        provider: expect.objectContaining({
          id: expect.any(String),
          email: expect.stringContaining(`task06.provider.${suffix}`),
        }),
        actor: expect.objectContaining({
          id: admin.id.toString(),
          role: AdminRole.ADMINISTRATOR,
        }),
      }),
    );
    expect(durationMs).toBeLessThan(500);

    await request(app.getHttpServer())
      .get('/admin/dashboard/providers')
      .set('Authorization', `Bearer ${adminToken(support)}`)
      .expect(200);

    for (const operator of [finance, moderator]) {
      await request(app.getHttpServer())
        .get('/admin/dashboard/providers')
        .set('Authorization', `Bearer ${adminToken(operator)}`)
        .expect(403);
    }
  });

  it.each([
    ['reject', {}],
    ['block', { reason: '   ' }],
    ['unblock', { reason: '\t' }],
  ])('returns 422 for missing or blank %s reason', async (command, body) => {
    const provider = await createProvider(ProviderStatus.APPROVED);
    const admin = await createOperator(AdminRole.ADMINISTRATOR);

    await request(app.getHttpServer())
      .post(`/admin/providers/${provider.id.toString()}/${command}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send(body)
      .expect(422);

    await expectDecisionAndAuditCounts(provider.id, 0);
  });

  it('returns one success and one 409 for concurrent commands without duplicate decisions', async () => {
    const provider = await createProvider();
    const admin = await createOperator(AdminRole.ADMINISTRATOR);
    const authorization = `Bearer ${adminToken(admin)}`;

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/admin/providers/${provider.id.toString()}/approve`)
        .set('Authorization', authorization),
      request(app.getHttpServer())
        .post(`/admin/providers/${provider.id.toString()}/approve`)
        .set('Authorization', authorization),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    await expectDecisionAndAuditCounts(provider.id, 1);
  });

  it.each([AdminRole.SUPPORT, AdminRole.FINANCE, AdminRole.MODERATOR])(
    'returns 403 when %s attempts every provider command',
    async (role) => {
      const operator = await createOperator(role);
      const authorization = `Bearer ${adminToken(operator)}`;

      for (const [status, command, body] of [
        [ProviderStatus.PENDING, 'approve', {}],
        [ProviderStatus.PENDING, 'reject', { reason: 'Missing document' }],
        [ProviderStatus.APPROVED, 'block', { reason: 'Operational risk' }],
        [ProviderStatus.BLOCKED, 'unblock', { reason: 'Review cleared' }],
      ] as const) {
        const provider = await createProvider(status);

        await request(app.getHttpServer())
          .post(`/admin/providers/${provider.id.toString()}/${command}`)
          .set('Authorization', authorization)
          .send(body)
          .expect(403);

        await expectDecisionAndAuditCounts(provider.id, 0);
      }
    },
  );

  it('rolls back provider status and compatibility when audit persistence fails', async () => {
    const provider = await createProvider();
    const admin = await createOperator(AdminRole.ADMINISTRATOR);

    const failingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminAuditService)
      .useValue({
        append: jest.fn().mockRejectedValue(new Error('forced audit failure')),
      })
      .compile();
    const failingApp = failingModule.createNestApplication();
    failingApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await failingApp.init();

    try {
      await request(failingApp.getHttpServer())
        .post(`/admin/providers/${provider.id.toString()}/approve`)
        .set('Authorization', `Bearer ${adminToken(admin)}`)
        .expect(500);
    } finally {
      await failingApp.close();
    }

    const unchanged = await prisma.provider.findUniqueOrThrow({
      where: { id: provider.id },
      select: { status: true, verified: true },
    });
    expect(unchanged).toEqual({
      status: ProviderStatus.PENDING,
      verified: false,
    });
    await expectDecisionAndAuditCounts(provider.id, 0);
  });
});
