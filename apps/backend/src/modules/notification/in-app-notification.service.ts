import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface InAppNotificationInput {
  userId: bigint;
  title: string;
  body: string;
  type: string;
  orderId?: bigint;
}

export interface InAppNotificationRecord {
  id: bigint;
  orderId: bigint | null;
  title: string;
  body: string;
  type: string;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class InAppNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: InAppNotificationInput): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "notificacoes" ("usuario_id", "pedido_id", "titulo", "mensagem", "tipo")
      VALUES (${input.userId}, ${input.orderId ?? null}, ${input.title}, ${input.body}, ${input.type})
    `);
  }

  async list(userId: bigint, skip = 0, take = 25) {
    const safeSkip = Number.isSafeInteger(skip) && skip >= 0 ? skip : 0;
    const safeTake = Number.isSafeInteger(take)
      ? Math.min(Math.max(take, 1), 100)
      : 25;
    const [items, counts] = await Promise.all([
      this.prisma.$queryRaw<InAppNotificationRecord[]>(Prisma.sql`
        SELECT "id", "pedido_id" AS "orderId", "titulo" AS "title",
               "mensagem" AS "body", "tipo" AS "type", "lida_em" AS "readAt",
               "criada_em" AS "createdAt"
        FROM "notificacoes"
        WHERE "usuario_id" = ${userId}
        ORDER BY "criada_em" DESC, "id" DESC
        LIMIT ${safeTake} OFFSET ${safeSkip}
      `),
      this.prisma.$queryRaw<
        Array<{ total: bigint; unreadCount: bigint }>
      >(Prisma.sql`
        SELECT COUNT(*) AS "total",
               COUNT(*) FILTER (WHERE "lida_em" IS NULL) AS "unreadCount"
        FROM "notificacoes"
        WHERE "usuario_id" = ${userId}
      `),
    ]);

    const total = counts[0]?.total ?? 0n;
    const unreadCount = counts[0]?.unreadCount ?? 0n;
    return {
      items: items.map((item) => ({
        id: item.id.toString(),
        orderId: item.orderId?.toString() ?? null,
        title: item.title,
        body: item.body,
        type: item.type,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      total: Number(total),
      unreadCount: Number(unreadCount),
    };
  }

  async markRead(userId: bigint, notificationId: bigint): Promise<boolean> {
    const updated = await this.prisma.$queryRaw<
      Array<{ id: bigint }>
    >(Prisma.sql`
      UPDATE "notificacoes"
      SET "lida_em" = CURRENT_TIMESTAMP
      WHERE "usuario_id" = ${userId}
        AND "id" = ${notificationId}
        AND "lida_em" IS NULL
      RETURNING "id"
    `);
    return updated.length > 0;
  }

  async markAllRead(userId: bigint): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE "notificacoes"
      SET "lida_em" = CURRENT_TIMESTAMP
      WHERE "usuario_id" = ${userId} AND "lida_em" IS NULL
    `);
  }
}
