import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AdminRole,
  ProviderDecisionAction,
  ProviderStatus,
  ServiceAreaMode,
  ServiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { convertBigInt } from '../../../shared/interceptors/bigint.interceptor';
import { AdminAuditAction } from '../audit/admin-audit.contracts';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminProvidersService } from './admin-providers.service';

describe('AdminProvidersService', () => {
  let prisma: any;
  let audit: { append: jest.Mock };
  let service: AdminProvidersService;
  const actor = {
    id: BigInt(60),
    name: 'Admin User',
    email: 'admin@example.com',
    role: AdminRole.ADMINISTRATOR,
    active: true,
    tokenVersion: 1,
    activatedAt: new Date('2026-07-02T00:00:00.000Z'),
  };
  const requestContext = {
    requestId: 'req-task-07',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  };

  const provider = {
    id: BigInt(10),
    bio: 'Licensed electrician',
    ratingAvg: 4.5,
    ratingCount: 8,
    verified: false,
    status: ProviderStatus.PENDING,
    statusChangedAt: new Date('2026-07-02T09:00:00.000Z'),
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
    updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    acceptPix: true,
    acceptsCard: false,
    emergencyCare: true,
    isAvailable24h: false,
    pagarmeRecipientId: 'rp_provider_10',
    user: {
      id: BigInt(10),
      name: 'Provider User',
      email: 'provider@example.com',
      phone: '11999999999',
      cpf: '12345678900',
      emailVerified: true,
      phoneVerified: false,
      photoUrl: null,
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
      passwordHash: 'must-never-leak',
    },
    _count: {
      services: 1,
      reviews: 2,
      decisions: 1,
    },
    services: [
      {
        id: BigInt(20),
        title: 'Electrical repair',
        description: 'Residential repair',
        category: 'eletrica',
        basePrice: 120,
        availability: { hidden: true },
        status: ServiceStatus.ATIVO,
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
        updatedAt: new Date('2026-07-01T10:00:00.000Z'),
      },
    ],
    serviceAreas: [
      {
        id: BigInt(30),
        mode: ServiceAreaMode.RADIUS,
        centerLat: -23.55,
        centerLng: -46.63,
        radiusKm: 10,
        polygon: { hidden: true },
        active: true,
        createdAt: new Date('2026-07-01T11:00:00.000Z'),
      },
    ],
    locations: [
      {
        id: BigInt(40),
        lat: -23.55,
        lng: -46.63,
        capturedAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    ],
  };

  const decision = {
    id: BigInt(50),
    action: ProviderDecisionAction.REJECT,
    fromStatus: ProviderStatus.PENDING,
    toStatus: ProviderStatus.REJECTED,
    reason: 'Missing required document',
    actorAdminId: BigInt(60),
    actorRole: AdminRole.ADMINISTRATOR,
    createdAt: new Date('2026-07-02T10:00:00.000Z'),
    actorAdmin: {
      id: BigInt(60),
      name: 'Former Admin',
      email: 'former-admin@example.com',
      active: false,
    },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (arg: any) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg(prisma);
      }),
      provider: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
      order: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      providerDecision: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    audit = {
      append: jest.fn().mockResolvedValue({ id: BigInt(70) }),
    };

    service = new AdminProvidersService(
      prisma as PrismaService,
      audit as unknown as AdminAuditService,
    );
  });

  it('maps status and submitted date filters to provider predicates', () => {
    const where = service.buildWhere({
      status: ProviderStatus.PENDING,
      submittedFrom: '2026-07-01T00:00:00.000Z',
      submittedTo: '2026-07-02T23:59:59.000Z',
    });

    expect(where).toEqual({
      status: ProviderStatus.PENDING,
      createdAt: {
        gte: new Date('2026-07-01T00:00:00.000Z'),
        lte: new Date('2026-07-02T23:59:59.000Z'),
      },
    });
  });

  it('caps list limit at 100 for service calls', () => {
    expect(service.getPageBounds({ page: 1, limit: 500 })).toEqual({
      page: 1,
      limit: 100,
    });
  });

  it('uses stable bounded provider queue queries', async () => {
    prisma.provider.count.mockResolvedValue(1);
    prisma.provider.findMany.mockResolvedValue([provider]);

    await service.list({ page: 2, limit: 10, status: ProviderStatus.PENDING });

    expect(prisma.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ProviderStatus.PENDING },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
      }),
    );
  });

  it('projects provider details without credentials or raw provider payloads', async () => {
    prisma.provider.findUnique.mockResolvedValue(provider);
    prisma.providerDecision.findMany.mockResolvedValue([decision]);
    prisma.providerDecision.findFirst
      .mockResolvedValueOnce(decision)
      .mockResolvedValueOnce({ createdAt: decision.createdAt });

    const result = await service.getDetails('10');
    const serialized = JSON.stringify(convertBigInt(result));

    expect(result.provider.identity.email).toBe('provider@example.com');
    expect(result.provider.paymentContext.pagarmeRecipientId).toBe(
      'rp_provider_10',
    );
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('rawProviderResponse');
    expect(serialized).not.toContain('availability');
    expect(serialized).not.toContain('polygon');
  });

  it('throws 404 for missing provider details', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);

    await expect(service.getDetails('999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns chronological paginated history', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: BigInt(10),
      status: ProviderStatus.REJECTED,
      statusChangedAt: new Date('2026-07-02T10:00:00.000Z'),
    });
    prisma.providerDecision.count.mockResolvedValue(1);
    prisma.providerDecision.findMany.mockResolvedValue([decision]);

    const result = await service.getHistory('10', { page: 1, limit: 25 });

    expect(prisma.providerDecision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: BigInt(10) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 25,
      }),
    );
    expect(result.data[0].actor).toEqual(
      expect.objectContaining({
        id: BigInt(60),
        email: 'former-admin@example.com',
        active: false,
      }),
    );
  });

  it('returns an empty provider dashboard with zero counts and a defined empty average', async () => {
    prisma.provider.count.mockResolvedValue(0);
    prisma.providerDecision.groupBy.mockResolvedValue([]);
    prisma.providerDecision.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.000Z',
    });

    expect(prisma.provider.count).toHaveBeenCalledWith({
      where: {
        status: ProviderStatus.PENDING,
        createdAt: {
          gte: new Date('2026-07-01T00:00:00.000Z'),
          lte: new Date('2026-07-31T23:59:59.000Z'),
        },
      },
    });
    expect(result.queue.pending).toBe(0);
    expect(result.decisions).toEqual({
      approve: 0,
      reject: 0,
      block: 0,
      unblock: 0,
      total: 0,
    });
    expect(result.reviewDuration).toEqual({
      averageMs: null,
      averageHours: null,
      reviewedProviders: 0,
    });
    expect(result.recentSensitiveActions).toEqual([]);
  });

  it('filters dashboard decision metrics to the selected period', async () => {
    prisma.provider.count.mockResolvedValue(2);
    prisma.providerDecision.groupBy.mockResolvedValue([
      {
        action: ProviderDecisionAction.APPROVE,
        _count: { _all: 1 },
      },
      {
        action: ProviderDecisionAction.BLOCK,
        _count: { _all: 2 },
      },
    ]);
    prisma.providerDecision.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      from: '2026-07-02T00:00:00.000Z',
      to: '2026-07-03T00:00:00.000Z',
    });

    expect(prisma.providerDecision.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-07-02T00:00:00.000Z'),
            lte: new Date('2026-07-03T00:00:00.000Z'),
          },
        },
        orderBy: { action: 'asc' },
      }),
    );
    expect(result.decisions).toEqual({
      approve: 1,
      reject: 0,
      block: 2,
      unblock: 0,
      total: 3,
    });
  });

  it('calculates review duration from the first terminal decision per provider', async () => {
    prisma.provider.count.mockResolvedValue(0);
    prisma.providerDecision.groupBy.mockResolvedValue([]);
    prisma.providerDecision.findMany
      .mockResolvedValueOnce([
        {
          id: BigInt(1),
          providerId: BigInt(10),
          action: ProviderDecisionAction.APPROVE,
          createdAt: new Date('2026-07-02T12:00:00.000Z'),
          provider: { createdAt: new Date('2026-07-02T08:00:00.000Z') },
        },
        {
          id: BigInt(2),
          providerId: BigInt(10),
          action: ProviderDecisionAction.REJECT,
          createdAt: new Date('2026-07-02T18:00:00.000Z'),
          provider: { createdAt: new Date('2026-07-02T08:00:00.000Z') },
        },
        {
          id: BigInt(3),
          providerId: BigInt(11),
          action: ProviderDecisionAction.REJECT,
          createdAt: new Date('2026-07-03T14:00:00.000Z'),
          provider: { createdAt: new Date('2026-07-03T08:00:00.000Z') },
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-04T00:00:00.000Z',
    });

    expect(prisma.providerDecision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: {
            in: [ProviderDecisionAction.APPROVE, ProviderDecisionAction.REJECT],
          },
        }),
        orderBy: [{ providerId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result.reviewDuration).toEqual({
      averageMs: 18_000_000,
      averageHours: 5,
      reviewedProviders: 2,
    });
  });

  it('rejects dashboard ranges beyond the MVP maximum', async () => {
    await expect(
      service.getDashboard({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-07-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('Dashboard date range cannot exceed 90 days');
  });

  it('throws 404 for missing provider history', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);

    await expect(service.getHistory('999', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects invalid provider identifiers before querying details', async () => {
    await expect(service.getDetails('not-a-number')).rejects.toThrow(
      'Invalid provider id',
    );
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    [
      'approve',
      ProviderStatus.PENDING,
      ProviderStatus.APPROVED,
      true,
      ProviderDecisionAction.APPROVE,
      AdminAuditAction.ProviderApproved,
      undefined,
    ],
    [
      'reject',
      ProviderStatus.PENDING,
      ProviderStatus.REJECTED,
      false,
      ProviderDecisionAction.REJECT,
      AdminAuditAction.ProviderRejected,
      { reason: ' Missing document ' },
    ],
    [
      'block',
      ProviderStatus.APPROVED,
      ProviderStatus.BLOCKED,
      false,
      ProviderDecisionAction.BLOCK,
      AdminAuditAction.ProviderBlocked,
      { reason: ' Operational risk ' },
    ],
    [
      'unblock',
      ProviderStatus.BLOCKED,
      ProviderStatus.APPROVED,
      true,
      ProviderDecisionAction.UNBLOCK,
      AdminAuditAction.ProviderUnblocked,
      { reason: ' Cleared review ' },
    ],
  ] as const)(
    '%s applies the valid transition, compatibility flag, decision, and audit atomically',
    async (
      method,
      fromStatus,
      toStatus,
      verified,
      action,
      auditAction,
      body,
    ) => {
      prisma.provider.findUnique.mockResolvedValue({
        id: BigInt(10),
        verified: !verified,
        status: fromStatus,
        statusChangedAt: new Date('2026-07-02T09:00:00.000Z'),
      });
      prisma.provider.updateMany.mockResolvedValue({ count: 1 });
      prisma.provider.findUniqueOrThrow.mockResolvedValue({
        id: BigInt(10),
        verified,
        status: toStatus,
        statusChangedAt: new Date('2026-07-02T11:00:00.000Z'),
      });
      prisma.providerDecision.create.mockResolvedValue({ id: BigInt(80) });

      const result =
        body === undefined
          ? await service.approve('10', actor, requestContext)
          : await service[method]('10', body, actor, requestContext);

      expect(prisma.provider.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(10), status: fromStatus },
          data: expect.objectContaining({
            status: toStatus,
            verified,
          }),
        }),
      );
      expect(prisma.providerDecision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: BigInt(10),
          action,
          fromStatus,
          toStatus,
          actorAdminId: actor.id,
          actorRole: actor.role,
          reason: body?.reason.trim() ?? null,
        }),
      });
      expect(audit.append).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          actor,
          action: auditAction,
          target: { type: 'Provider', id: BigInt(10) },
          reason: body?.reason.trim() ?? null,
          requestId: requestContext.requestId,
        }),
      );
      expect(result.provider).toEqual({
        id: BigInt(10),
        verification: { providerVerified: verified },
        status: {
          current: toStatus,
          changedAt: new Date('2026-07-02T11:00:00.000Z'),
        },
      });
    },
  );

  it.each([
    ['block', ProviderStatus.PENDING, { reason: 'Cannot block pending' }],
    ['unblock', ProviderStatus.PENDING, { reason: 'Cannot unblock pending' }],
    ['approve', ProviderStatus.APPROVED, undefined],
    ['reject', ProviderStatus.APPROVED, { reason: 'Already approved' }],
  ] as const)(
    'rejects invalid %s transition from %s',
    async (method, currentStatus, body) => {
      prisma.provider.findUnique.mockResolvedValue({
        id: BigInt(10),
        verified: currentStatus === ProviderStatus.APPROVED,
        status: currentStatus,
        statusChangedAt: new Date('2026-07-02T09:00:00.000Z'),
      });

      const call =
        body === undefined
          ? service.approve('10', actor, requestContext)
          : service[method]('10', body, actor, requestContext);

      await expect(call).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.provider.updateMany).not.toHaveBeenCalled();
      expect(prisma.providerDecision.create).not.toHaveBeenCalled();
      expect(audit.append).not.toHaveBeenCalled();
    },
  );

  it('returns 409 when the conditional provider update is stale', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: BigInt(10),
      verified: false,
      status: ProviderStatus.PENDING,
      statusChangedAt: new Date('2026-07-02T09:00:00.000Z'),
    });
    prisma.provider.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.approve('10', actor, requestContext),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.providerDecision.create).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
  });

  it.each([
    ['reject', {}],
    ['reject', { reason: '   ' }],
    ['block', {}],
    ['unblock', { reason: '\t' }],
  ] as const)(
    'returns 422 when %s reason is missing or blank',
    async (method, body) => {
      await expect(
        service[method]('10', body, actor, requestContext),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );
});
