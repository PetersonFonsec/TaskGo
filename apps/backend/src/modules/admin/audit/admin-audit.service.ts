import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationResponse } from '../../../shared/services/pagination/pagination.interface';
import {
  AdminAuditActorSnapshot,
  AdminAuditAppendInput,
} from './admin-audit.contracts';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';
import { AdminTelemetryService } from '../../../observability/admin-telemetry.service';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

const SECRET_KEY_PATTERN =
  /(password|senha|token|secret|authorization|cookie|api[-_]?key|credential)/i;
const PERSONAL_RECORD_CONTAINER_PATTERN =
  /^(user|usuario|customer|client|cliente|provider|prestador|adminUser|operator|actor)$/i;
const PERSONAL_FIELD_NAMES = new Set([
  'name',
  'nome',
  'email',
  'cpf',
  'phone',
  'telefone',
  'address',
  'endereco',
  'photoUrl',
  'fotoUrl',
  'foto_url',
]);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type PageBounds = {
  page: number;
  limit: number;
};

type AuditLogRow = Prisma.AuditLogGetPayload<{
  select: typeof auditLogSelect;
}>;

const auditLogSelect = {
  id: true,
  actorAdminId: true,
  actorRole: true,
  action: true,
  entityType: true,
  entityId: true,
  before: true,
  after: true,
  reason: true,
  requestId: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  actorAdmin: {
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  },
} satisfies Prisma.AuditLogSelect;

@Injectable()
export class AdminAuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly telemetry?: AdminTelemetryService,
  ) {}

  async append(
    tx: Prisma.TransactionClient,
    input: AdminAuditAppendInput,
  ): Promise<AuditLog> {
    const actor = this.snapshotActor(input);

    try {
      return await tx.auditLog.create({
        data: {
          actorAdminId: actor.id,
          actorRole: actor.role,
          action: input.action,
          entityType: input.target.type,
          entityId: String(input.target.id),
          before: this.toPrismaJson(this.sanitizeDelta(input.before, 'before')),
          after: this.toPrismaJson(this.sanitizeDelta(input.after, 'after')),
          reason: input.reason ?? null,
          requestId: input.requestId,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      this.telemetry?.recordAuditWriteFailure(input.action);
      throw error;
    }
  }

  buildWhere(query: AdminAuditLogQueryDto): Prisma.AuditLogWhereInput {
    const entityType = query.entityType ?? query.targetType;
    const entityId = query.entityId ?? query.targetId;

    return {
      ...(query.operatorId
        ? {
            actorAdminId: this.parsePositiveBigInt(
              query.operatorId,
              'operatorId',
            ),
          }
        : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...this.buildDateFilter(query),
    };
  }

  getPageBounds(query: AdminAuditLogQueryDto): PageBounds {
    return {
      page: Math.max(query.page ?? DEFAULT_PAGE, 1),
      limit: Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT),
    };
  }

  async list(
    query: AdminAuditLogQueryDto,
  ): Promise<PaginationResponse<ReturnType<typeof this.toListItem>>> {
    const { page, limit } = this.getPageBounds(query);
    const where = this.buildWhere(query);

    const startedAt = process.hrtime.bigint();
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: auditLogSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    this.telemetry?.observeDatabaseQuery(
      '/admin/audit-logs',
      Number(process.hrtime.bigint() - startedAt) / Number(1_000_000n),
    );

    return this.toPage(
      rows.map((row) => this.toListItem(row)),
      {
        total,
        page,
        limit,
      },
    );
  }

  async getDetail(id: string) {
    const auditLogId = this.parsePositiveBigInt(id, 'auditLogId');
    const row = await this.prisma.auditLog.findUnique({
      where: { id: auditLogId },
      select: auditLogSelect,
    });

    if (!row) {
      throw new NotFoundException('Audit log not found');
    }

    return { auditLog: this.toDetail(row) };
  }

  private snapshotActor(input: AdminAuditAppendInput): AdminAuditActorSnapshot {
    if (!input.actor?.id || !input.actor.role) {
      throw new BadRequestException('Audit actor snapshot is required');
    }
    if (!input.requestId) {
      throw new BadRequestException('Audit request ID is required');
    }
    if (!input.target?.type || input.target.id === undefined) {
      throw new BadRequestException('Audit target is required');
    }

    return {
      id: input.actor.id,
      role: input.actor.role,
    };
  }

  private sanitizeDelta(
    delta: Record<string, unknown> | undefined,
    path: string,
  ): JsonObject | undefined {
    if (delta === undefined) return undefined;
    const sanitized = this.sanitizeObject(delta, path, false);
    return sanitized;
  }

  private sanitizeObject(
    value: Record<string, unknown>,
    path: string,
    personalRecordContext: boolean,
  ): JsonObject {
    const personalFieldCount = Object.keys(value).filter((key) =>
      PERSONAL_FIELD_NAMES.has(key),
    ).length;

    if (personalRecordContext || personalFieldCount >= 3) {
      throw new BadRequestException(
        `Audit payload cannot include complete personal records at ${path}`,
      );
    }

    return Object.entries(value).reduce<JsonObject>((acc, [key, item]) => {
      this.assertAllowedKey(key, `${path}.${key}`);

      const nestedPersonalContext =
        PERSONAL_RECORD_CONTAINER_PATTERN.test(key) &&
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        !(item instanceof Date);

      acc[key] = this.sanitizeValue(
        item,
        `${path}.${key}`,
        nestedPersonalContext,
      );
      return acc;
    }, {});
  }

  private sanitizeValue(
    value: unknown,
    path: string,
    personalRecordContext: boolean,
  ): JsonValue {
    if (value === null) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        this.sanitizeValue(item, `${path}[${index}]`, personalRecordContext),
      );
    }
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(
        value as Record<string, unknown>,
        path,
        personalRecordContext,
      );
    }

    throw new BadRequestException(
      `Audit payload value is not JSON-safe at ${path}`,
    );
  }

  private assertAllowedKey(key: string, path: string) {
    if (SECRET_KEY_PATTERN.test(key)) {
      throw new BadRequestException(
        `Audit payload cannot include sensitive field ${path}`,
      );
    }
  }

  private toPrismaJson(value: JsonObject | undefined) {
    return value as Prisma.InputJsonValue | undefined;
  }

  private buildDateFilter(
    query: AdminAuditLogQueryDto,
  ): Pick<Prisma.AuditLogWhereInput, 'createdAt'> {
    if (!query.from && !query.to) return {};

    return {
      createdAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }

  private parsePositiveBigInt(value: string, label: string) {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    const parsed = BigInt(value);
    if (parsed <= 0n) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return parsed;
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

  private toListItem(row: AuditLogRow) {
    return {
      id: row.id,
      action: row.action,
      target: {
        type: row.entityType,
        id: row.entityId,
      },
      actor: this.toActor(row),
      reason: row.reason,
      requestId: row.requestId,
      createdAt: row.createdAt,
    };
  }

  private toDetail(row: AuditLogRow) {
    return {
      ...this.toListItem(row),
      before: this.sanitizeStoredJson(row.before),
      after: this.sanitizeStoredJson(row.after),
      context: {
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
      },
    };
  }

  private toActor(row: AuditLogRow) {
    return {
      id: row.actorAdminId,
      role: row.actorRole,
      name: row.actorAdmin.name,
      email: row.actorAdmin.email,
      active: row.actorAdmin.active,
    };
  }

  private sanitizeStoredJson(value: Prisma.JsonValue | null) {
    if (value === null) return null;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeStoredJson(item));
    }

    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, item]) => {
        if (SECRET_KEY_PATTERN.test(key)) return acc;
        acc[key] = this.sanitizeStoredJson(item as Prisma.JsonValue);
        return acc;
      },
      {},
    );
  }
}
