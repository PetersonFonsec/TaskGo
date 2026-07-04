import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProviderDecisionAction, ProviderStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationResponse } from '../../../shared/services/pagination/pagination.interface';
import {
  AdminAuditAction,
  AdminAuditRequestContext,
} from '../audit/admin-audit.contracts';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminActor } from '../auth/admin-actor';
import { AdminProviderDashboardQueryDto } from './dto/admin-provider-dashboard-query.dto';
import { AdminProviderQueryDto } from './dto/admin-provider-query.dto';
import { ProviderDecisionReasonDto } from './dto/provider-decision-command.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const DETAIL_SERVICE_LIMIT = 50;
const DETAIL_LOCATION_LIMIT = 5;
const DETAIL_SERVICE_AREA_LIMIT = 20;
const DETAIL_RECENT_ORDER_LIMIT = 10;
const DETAIL_RECENT_DECISION_LIMIT = 10;
const DASHBOARD_DEFAULT_DAYS = 30;
const DASHBOARD_MAX_DAYS = 90;
const DASHBOARD_RECENT_ACTION_LIMIT = 10;
const PROVIDER_ENTITY = 'Provider';
const TERMINAL_PROVIDER_DECISIONS = [
  ProviderDecisionAction.APPROVE,
  ProviderDecisionAction.REJECT,
];

type ProviderTransition = {
  action: ProviderDecisionAction;
  auditAction: AdminAuditAction;
  fromStatus: ProviderStatus;
  toStatus: ProviderStatus;
  requiresReason: boolean;
};

const PROVIDER_TRANSITIONS: Record<ProviderDecisionAction, ProviderTransition> =
  {
    [ProviderDecisionAction.APPROVE]: {
      action: ProviderDecisionAction.APPROVE,
      auditAction: AdminAuditAction.ProviderApproved,
      fromStatus: ProviderStatus.PENDING,
      toStatus: ProviderStatus.APPROVED,
      requiresReason: false,
    },
    [ProviderDecisionAction.REJECT]: {
      action: ProviderDecisionAction.REJECT,
      auditAction: AdminAuditAction.ProviderRejected,
      fromStatus: ProviderStatus.PENDING,
      toStatus: ProviderStatus.REJECTED,
      requiresReason: true,
    },
    [ProviderDecisionAction.BLOCK]: {
      action: ProviderDecisionAction.BLOCK,
      auditAction: AdminAuditAction.ProviderBlocked,
      fromStatus: ProviderStatus.APPROVED,
      toStatus: ProviderStatus.BLOCKED,
      requiresReason: true,
    },
    [ProviderDecisionAction.UNBLOCK]: {
      action: ProviderDecisionAction.UNBLOCK,
      auditAction: AdminAuditAction.ProviderUnblocked,
      fromStatus: ProviderStatus.BLOCKED,
      toStatus: ProviderStatus.APPROVED,
      requiresReason: true,
    },
  };

type PageBounds = {
  page: number;
  limit: number;
};

type ProviderQueueRow = Prisma.ProviderGetPayload<{
  select: typeof providerQueueSelect;
}>;

type ProviderDetailRow = Prisma.ProviderGetPayload<{
  select: typeof providerDetailSelect;
}>;

type ProviderDecisionRow = Prisma.ProviderDecisionGetPayload<{
  select: typeof providerDecisionSelect;
}>;

type DashboardDecisionRow = Prisma.ProviderDecisionGetPayload<{
  select: typeof dashboardDecisionSelect;
}>;

type DashboardReviewDecisionRow = Prisma.ProviderDecisionGetPayload<{
  select: typeof dashboardReviewDecisionSelect;
}>;

const providerQueueSelect = {
  id: true,
  bio: true,
  ratingAvg: true,
  ratingCount: true,
  verified: true,
  status: true,
  statusChangedAt: true,
  createdAt: true,
  updatedAt: true,
  acceptPix: true,
  acceptsCard: true,
  emergencyCare: true,
  isAvailable24h: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      cpf: true,
      emailVerified: true,
      phoneVerified: true,
      photoUrl: true,
      createdAt: true,
    },
  },
  _count: {
    select: {
      services: true,
      reviews: true,
      decisions: true,
    },
  },
} satisfies Prisma.ProviderSelect;

const providerDetailSelect = {
  ...providerQueueSelect,
  pagarmeRecipientId: true,
  services: {
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      basePrice: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: DETAIL_SERVICE_LIMIT,
  },
  serviceAreas: {
    select: {
      id: true,
      mode: true,
      centerLat: true,
      centerLng: true,
      radiusKm: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: DETAIL_SERVICE_AREA_LIMIT,
  },
  locations: {
    select: {
      id: true,
      lat: true,
      lng: true,
      capturedAt: true,
    },
    orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
    take: DETAIL_LOCATION_LIMIT,
  },
} satisfies Prisma.ProviderSelect;

const providerDecisionSelect = {
  id: true,
  action: true,
  fromStatus: true,
  toStatus: true,
  reason: true,
  actorAdminId: true,
  actorRole: true,
  createdAt: true,
  actorAdmin: {
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  },
} satisfies Prisma.ProviderDecisionSelect;

const dashboardDecisionSelect = {
  id: true,
  providerId: true,
  action: true,
  fromStatus: true,
  toStatus: true,
  reason: true,
  actorAdminId: true,
  actorRole: true,
  createdAt: true,
  actorAdmin: {
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  },
  provider: {
    select: {
      id: true,
      status: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.ProviderDecisionSelect;

const dashboardReviewDecisionSelect = {
  id: true,
  providerId: true,
  action: true,
  createdAt: true,
  provider: {
    select: {
      createdAt: true,
    },
  },
} satisfies Prisma.ProviderDecisionSelect;

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  buildWhere(query: AdminProviderQueryDto): Prisma.ProviderWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...this.buildSubmissionDateFilter(query),
    };
  }

  getPageBounds(query: AdminProviderQueryDto): PageBounds {
    return {
      page: Math.max(query.page ?? DEFAULT_PAGE, 1),
      limit: Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
    };
  }

  async list(
    query: AdminProviderQueryDto,
  ): Promise<PaginationResponse<ReturnType<typeof this.toQueueItem>>> {
    const { page, limit } = this.getPageBounds(query);
    const where = this.buildWhere(query);

    const [total, providers] = await this.prisma.$transaction([
      this.prisma.provider.count({ where }),
      this.prisma.provider.findMany({
        where,
        select: providerQueueSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return this.toPage(
      providers.map((provider) => this.toQueueItem(provider)),
      {
        total,
        page,
        limit,
      },
    );
  }

  async getDetails(id: string) {
    const providerId = this.parseProviderId(id);
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: providerDetailSelect,
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const [
      orderStatusCounts,
      recentOrders,
      recentDecisions,
      latestDecision,
      firstDecision,
    ] = await this.prisma.$transaction([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { service: { providerId } },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.order.findMany({
        where: { service: { providerId } },
        select: {
          id: true,
          status: true,
          requestedAt: true,
          scheduledFor: true,
          finalPrice: true,
          service: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        take: DETAIL_RECENT_ORDER_LIMIT,
      }),
      this.prisma.providerDecision.findMany({
        where: { providerId },
        select: providerDecisionSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: DETAIL_RECENT_DECISION_LIMIT,
      }),
      this.prisma.providerDecision.findFirst({
        where: { providerId },
        select: providerDecisionSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.providerDecision.findFirst({
        where: {
          providerId,
          action: {
            in: [ProviderDecisionAction.APPROVE, ProviderDecisionAction.REJECT],
          },
        },
        select: { createdAt: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      provider: this.toDetail(
        provider,
        orderStatusCounts,
        recentOrders,
        recentDecisions,
        latestDecision,
        firstDecision?.createdAt ?? null,
      ),
    };
  }

  async getHistory(id: string, query: AdminProviderQueryDto) {
    const providerId = this.parseProviderId(id);
    const exists = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, status: true, statusChangedAt: true },
    });

    if (!exists) {
      throw new NotFoundException('Provider not found');
    }

    const { page, limit } = this.getPageBounds(query);
    const where: Prisma.ProviderDecisionWhereInput = { providerId };

    const [total, decisions] = await this.prisma.$transaction([
      this.prisma.providerDecision.count({ where }),
      this.prisma.providerDecision.findMany({
        where,
        select: providerDecisionSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return this.toPage(
      decisions.map((decision) => this.toDecision(decision)),
      { total, page, limit },
    );
  }

  async getDashboard(query: AdminProviderDashboardQueryDto) {
    const window = this.resolveDashboardWindow(query);
    const decisionWhere: Prisma.ProviderDecisionWhereInput = {
      createdAt: {
        gte: window.from,
        lte: window.to,
      },
    };

    const [pendingCount, decisionsByAction, reviewDecisions, recentDecisions] =
      await this.prisma.$transaction([
        this.prisma.provider.count({
          where: {
            status: ProviderStatus.PENDING,
            createdAt: {
              gte: window.from,
              lte: window.to,
            },
          },
        }),
        this.prisma.providerDecision.groupBy({
          by: ['action'],
          where: decisionWhere,
          orderBy: { action: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.providerDecision.findMany({
          where: {
            ...decisionWhere,
            action: { in: TERMINAL_PROVIDER_DECISIONS },
          },
          select: dashboardReviewDecisionSelect,
          orderBy: [{ providerId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.providerDecision.findMany({
          where: decisionWhere,
          select: dashboardDecisionSelect,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: DASHBOARD_RECENT_ACTION_LIMIT,
        }),
      ]);

    return {
      period: {
        from: window.from,
        to: window.to,
        defaultDays: DASHBOARD_DEFAULT_DAYS,
        maxDays: DASHBOARD_MAX_DAYS,
      },
      queue: {
        pending: pendingCount,
      },
      decisions: this.toDashboardDecisionTotals(decisionsByAction),
      reviewDuration: this.toAverageReviewDuration(reviewDecisions),
      recentSensitiveActions: recentDecisions.map((decision) =>
        this.toDashboardAction(decision),
      ),
    };
  }

  approve(
    id: string,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    return this.executeTransition(
      id,
      PROVIDER_TRANSITIONS[ProviderDecisionAction.APPROVE],
      undefined,
      actor,
      requestContext,
    );
  }

  reject(
    id: string,
    body: ProviderDecisionReasonDto,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    return this.executeTransition(
      id,
      PROVIDER_TRANSITIONS[ProviderDecisionAction.REJECT],
      body,
      actor,
      requestContext,
    );
  }

  block(
    id: string,
    body: ProviderDecisionReasonDto,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    return this.executeTransition(
      id,
      PROVIDER_TRANSITIONS[ProviderDecisionAction.BLOCK],
      body,
      actor,
      requestContext,
    );
  }

  unblock(
    id: string,
    body: ProviderDecisionReasonDto,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    return this.executeTransition(
      id,
      PROVIDER_TRANSITIONS[ProviderDecisionAction.UNBLOCK],
      body,
      actor,
      requestContext,
    );
  }

  private async executeTransition(
    id: string,
    transition: ProviderTransition,
    body: ProviderDecisionReasonDto | undefined,
    actor: AdminActor,
    requestContext: AdminAuditRequestContext,
  ) {
    const providerId = this.parseProviderId(id);
    const reason = this.normalizeReason(body?.reason, transition);
    const changedAt = new Date();

    const provider = await this.prisma.$transaction(async (tx) => {
      const current = await tx.provider.findUnique({
        where: { id: providerId },
        select: {
          id: true,
          verified: true,
          status: true,
          statusChangedAt: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Provider not found');
      }
      if (current.status !== transition.fromStatus) {
        throw new ConflictException('Provider state transition conflict');
      }

      const updated = await tx.provider.updateMany({
        where: { id: providerId, status: transition.fromStatus },
        data: {
          status: transition.toStatus,
          verified: transition.toStatus === ProviderStatus.APPROVED,
          statusChangedAt: changedAt,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException('Provider state transition conflict');
      }

      const saved = await tx.provider.findUniqueOrThrow({
        where: { id: providerId },
        select: {
          id: true,
          verified: true,
          status: true,
          statusChangedAt: true,
        },
      });

      await tx.providerDecision.create({
        data: {
          providerId,
          action: transition.action,
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          reason,
          actorAdminId: actor.id,
          actorRole: actor.role,
        },
      });

      await this.audit.append(tx, {
        actor,
        action: transition.auditAction,
        target: { type: PROVIDER_ENTITY, id: providerId },
        before: {
          status: current.status,
          verified: current.verified,
          statusChangedAt: current.statusChangedAt,
        },
        after: {
          status: saved.status,
          verified: saved.verified,
          statusChangedAt: saved.statusChangedAt,
        },
        reason,
        ...requestContext,
      });

      return saved;
    });

    return { provider: this.toLifecycleState(provider) };
  }

  private normalizeReason(
    reason: string | undefined,
    transition: ProviderTransition,
  ) {
    const normalized = reason?.trim();
    if (!transition.requiresReason) return normalized || null;
    if (!normalized) {
      throw new UnprocessableEntityException(
        'Provider decision reason is required',
      );
    }

    return normalized;
  }

  private buildSubmissionDateFilter(
    query: AdminProviderQueryDto,
  ): Pick<Prisma.ProviderWhereInput, 'createdAt'> {
    if (!query.submittedFrom && !query.submittedTo) return {};

    return {
      createdAt: {
        ...(query.submittedFrom ? { gte: new Date(query.submittedFrom) } : {}),
        ...(query.submittedTo ? { lte: new Date(query.submittedTo) } : {}),
      },
    };
  }

  private resolveDashboardWindow(query: AdminProviderDashboardQueryDto) {
    const now = new Date();
    const to = query.to ? new Date(query.to) : now;
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DASHBOARD_DEFAULT_DAYS * 86_400_000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid dashboard date range');
    }
    if (from > to) {
      throw new BadRequestException(
        'Dashboard from date must be before to date',
      );
    }
    if (to.getTime() - from.getTime() > DASHBOARD_MAX_DAYS * 86_400_000) {
      throw new BadRequestException(
        `Dashboard date range cannot exceed ${DASHBOARD_MAX_DAYS} days`,
      );
    }

    return { from, to };
  }

  private parseProviderId(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException('Invalid provider id');
    }

    const providerId = BigInt(id);
    if (providerId <= 0n) {
      throw new BadRequestException('Invalid provider id');
    }

    return providerId;
  }

  private toPage<T>(
    data: T[],
    input: { total: number; page: number; limit: number },
  ): PaginationResponse<T> {
    const totalPages = Math.max(1, Math.ceil(input.total / input.limit));

    return {
      data,
      meta: {
        total: input.total,
        page: input.page,
        limit: input.limit,
        totalPages,
        hasPrevPage: input.page > 1,
        hasNextPage: input.page < totalPages,
      },
    };
  }

  private toQueueItem(provider: ProviderQueueRow) {
    return {
      id: provider.id,
      submittedAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      identity: this.toIdentity(provider),
      verification: this.toVerification(provider),
      status: {
        current: provider.status,
        changedAt: provider.statusChangedAt,
      },
      serviceSummary: {
        count: provider._count.services,
      },
      reviewSummary: {
        averageRating: provider.ratingAvg,
        ratingCount: provider.ratingCount,
        reviewCount: provider._count.reviews,
      },
      decisionSummary: {
        count: provider._count.decisions,
      },
      capabilities: this.toCapabilities(provider),
    };
  }

  private toDetail(
    provider: ProviderDetailRow,
    orderStatusCounts: Array<{
      status: string;
      _count?: true | { _all?: number };
    }>,
    recentOrders: any[],
    recentDecisions: ProviderDecisionRow[],
    latestDecision: ProviderDecisionRow | null,
    firstDecisionAt: Date | null,
  ) {
    return {
      ...this.toQueueItem(provider),
      bio: provider.bio,
      paymentContext: {
        pagarmeRecipientId: provider.pagarmeRecipientId,
      },
      services: provider.services.map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        category: service.category,
        basePrice: service.basePrice,
        status: service.status,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      })),
      serviceAreas: provider.serviceAreas.map((area) => ({
        id: area.id,
        mode: area.mode,
        centerLat: area.centerLat,
        centerLng: area.centerLng,
        radiusKm: area.radiusKm,
        active: area.active,
        createdAt: area.createdAt,
      })),
      locations: provider.locations.map((location) => ({
        id: location.id,
        lat: location.lat,
        lng: location.lng,
        capturedAt: location.capturedAt,
      })),
      operationalHistory: {
        ordersByStatus: orderStatusCounts.map((item) => ({
          status: item.status,
          count:
            typeof item._count === 'object' && item._count
              ? (item._count._all ?? 0)
              : 0,
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          status: order.status,
          requestedAt: order.requestedAt,
          scheduledFor: order.scheduledFor,
          finalPrice: order.finalPrice,
          service: order.service,
        })),
      },
      decisionContext: {
        latestDecision: latestDecision ? this.toDecision(latestDecision) : null,
        recentDecisions: recentDecisions.map((decision) =>
          this.toDecision(decision),
        ),
        firstDecisionAt,
      },
    };
  }

  private toIdentity(provider: ProviderQueueRow) {
    return {
      id: provider.user.id,
      name: provider.user.name,
      email: provider.user.email,
      phone: provider.user.phone,
      cpf: provider.user.cpf,
      photoUrl: provider.user.photoUrl,
      userCreatedAt: provider.user.createdAt,
    };
  }

  private toVerification(provider: ProviderQueueRow) {
    return {
      providerVerified: provider.verified,
      emailVerified: provider.user.emailVerified,
      phoneVerified: provider.user.phoneVerified,
    };
  }

  private toCapabilities(provider: ProviderQueueRow) {
    return {
      acceptsPix: provider.acceptPix,
      acceptsCard: provider.acceptsCard,
      emergencyCare: provider.emergencyCare,
      available24h: provider.isAvailable24h,
    };
  }

  private toLifecycleState(provider: {
    id: bigint;
    verified: boolean;
    status: ProviderStatus;
    statusChangedAt: Date;
  }) {
    return {
      id: provider.id,
      verification: {
        providerVerified: provider.verified,
      },
      status: {
        current: provider.status,
        changedAt: provider.statusChangedAt,
      },
    };
  }

  private toDecision(decision: ProviderDecisionRow) {
    return {
      id: decision.id,
      action: decision.action,
      fromStatus: decision.fromStatus,
      toStatus: decision.toStatus,
      reason: decision.reason,
      createdAt: decision.createdAt,
      actor: {
        id: decision.actorAdminId,
        role: decision.actorRole,
        name: decision.actorAdmin.name,
        email: decision.actorAdmin.email,
        active: decision.actorAdmin.active,
      },
    };
  }

  private toDashboardDecisionTotals(
    grouped: Array<{
      action: ProviderDecisionAction;
      _count?: true | { _all?: number };
    }>,
  ) {
    const counts = new Map(
      grouped.map((item) => [
        item.action,
        typeof item._count === 'object' && item._count
          ? (item._count._all ?? 0)
          : 0,
      ]),
    );

    return {
      approve: counts.get(ProviderDecisionAction.APPROVE) ?? 0,
      reject: counts.get(ProviderDecisionAction.REJECT) ?? 0,
      block: counts.get(ProviderDecisionAction.BLOCK) ?? 0,
      unblock: counts.get(ProviderDecisionAction.UNBLOCK) ?? 0,
      total: [...counts.values()].reduce((total, count) => total + count, 0),
    };
  }

  private toAverageReviewDuration(decisions: DashboardReviewDecisionRow[]) {
    const firstTerminalByProvider = new Map<
      bigint,
      DashboardReviewDecisionRow
    >();

    for (const decision of decisions) {
      if (!firstTerminalByProvider.has(decision.providerId)) {
        firstTerminalByProvider.set(decision.providerId, decision);
      }
    }

    const durations = [...firstTerminalByProvider.values()]
      .map(
        (decision) =>
          decision.createdAt.getTime() - decision.provider.createdAt.getTime(),
      )
      .filter((durationMs) => durationMs >= 0);

    const averageMs = durations.length
      ? Math.round(
          durations.reduce((total, durationMs) => total + durationMs, 0) /
            durations.length,
        )
      : null;

    return {
      averageMs,
      averageHours: averageMs === null ? null : averageMs / 3_600_000,
      reviewedProviders: durations.length,
    };
  }

  private toDashboardAction(decision: DashboardDecisionRow) {
    return {
      id: decision.id,
      action: decision.action,
      fromStatus: decision.fromStatus,
      toStatus: decision.toStatus,
      reason: decision.reason,
      createdAt: decision.createdAt,
      provider: {
        id: decision.providerId,
        status: decision.provider.status,
        name: decision.provider.user.name,
        email: decision.provider.user.email,
      },
      actor: {
        id: decision.actorAdminId,
        role: decision.actorRole,
        name: decision.actorAdmin.name,
        email: decision.actorAdmin.email,
        active: decision.actorAdmin.active,
      },
    };
  }
}
