import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { isCustomerRole } from '../../shared/auth/authenticated-identity';
import { lockSession } from './session-lock';

const DAY_MS = 86_400_000;
const INVALID = 'Invalid or expired refresh token';

/**
 * Janela em que a segunda apresentação de um token recém-usado é tratada
 * como corrida do próprio aparelho (duas renovações disparadas juntas): a
 * requisição perdedora recebe 401, mas a família não é revogada. Fora dela,
 * a reapresentação é tratada como roubo e revoga a família inteira.
 */
export const REFRESH_REUSE_GRACE_MS = 10_000;

type Db = PrismaService | Prisma.TransactionClient;

interface LockedToken {
  id: bigint;
  userId: bigint;
  familyId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  dbNow: Date;
}

type RotationOutcome =
  | { kind: 'rotated'; userId: bigint; familyId: string; refresh_token: string }
  | { kind: 'rejected' };

/**
 * Refresh tokens opacos com rotação. Cada uso gera um novo token na mesma
 * família (a sessão de um aparelho). A rotação roda numa transação com
 * bloqueio da linha do token: consumir o antigo e gravar o sucessor
 * acontecem juntos ou não acontecem, e só uma requisição concorrente vence.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Cria um token na família indicada (nova sessão quando omitida). */
  async issue(
    userId: bigint,
    familyId: string = randomUUID(),
    db: Db = this.prisma,
  ) {
    const refresh_token = randomBytes(48).toString('base64url');
    const ttlDays = Number(this.config.get('auth.refreshTokenTtlDays') ?? 60);
    await db.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hash(refresh_token),
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
      },
    });
    return { refresh_token, familyId };
  }

  /** Valida e consome o token; devolve o usuário, a sessão e o sucessor. */
  async rotate(rawToken: string) {
    const outcome = await this.prisma.$transaction((tx) =>
      this.rotateLocked(tx, this.hash(rawToken)),
    );
    // A revogação já foi confirmada pela transação antes do 401.
    if (outcome.kind !== 'rotated') throw new UnauthorizedException(INVALID);
    const { userId, familyId, refresh_token } = outcome;
    return { userId, familyId, refresh_token };
  }

  /**
   * Logout: revoga a sessão do aparelho e desvincula os aparelhos registrados
   * nela, na mesma transação. Token desconhecido ou já revogado é ignorado.
   */
  async revoke(rawToken: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash: this.hash(rawToken) },
        select: { familyId: true, userId: true },
      });
      if (stored) await this.endSession(tx, stored.familyId, stored.userId);
    });
  }

  private async rotateLocked(
    tx: Prisma.TransactionClient,
    tokenHash: string,
  ): Promise<RotationOutcome> {
    // Ordem de bloqueio comum a rotação, logout e registro de aparelho:
    // primeiro a sessão, depois as linhas. Evita deadlock entre eles.
    const family = await tx.refreshToken.findUnique({
      where: { tokenHash },
      select: { familyId: true },
    });
    if (!family) return { kind: 'rejected' };
    await lockSession(tx, family.familyId);
    // FOR UPDATE serializa renovações concorrentes do mesmo token entre
    // instâncias; o relógio é o do banco, comum a todas elas.
    const [stored] = await tx.$queryRaw<LockedToken[]>`
      SELECT id,
             usuario_id AS "userId",
             family_id AS "familyId",
             expires_at AS "expiresAt",
             used_at AS "usedAt",
             revoked_at AS "revokedAt",
             created_at AS "createdAt",
             (now() AT TIME ZONE 'UTC') AS "dbNow"
        FROM refresh_tokens
       WHERE token_hash = ${tokenHash}
       FOR UPDATE`;
    if (!stored) return { kind: 'rejected' };

    if (stored.usedAt && !stored.revokedAt) {
      const sinceUse = stored.dbNow.getTime() - stored.usedAt.getTime();
      // Corrida legítima: não gera sucessor nem revoga a sessão vencedora.
      if (sinceUse >= 0 && sinceUse <= REFRESH_REUSE_GRACE_MS) {
        return { kind: 'rejected' };
      }
    }
    if (stored.usedAt || stored.revokedAt) {
      await this.endSession(tx, stored.familyId, stored.userId);
      return { kind: 'rejected' };
    }

    const user = await tx.user.findUnique({
      where: { id: stored.userId },
      select: { type: true, passwordChangedAt: true },
    });
    const passwordChangedLater =
      user?.passwordChangedAt &&
      user.passwordChangedAt.getTime() >= stored.createdAt.getTime();
    if (
      !user ||
      stored.expiresAt.getTime() <= stored.dbNow.getTime() ||
      !isCustomerRole(user.type) ||
      passwordChangedLater
    ) {
      await this.endSession(tx, stored.familyId, stored.userId);
      return { kind: 'rejected' };
    }

    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { usedAt: stored.dbNow },
    });
    const { refresh_token } = await this.issue(
      stored.userId,
      stored.familyId,
      tx,
    );
    return {
      kind: 'rotated',
      userId: stored.userId,
      familyId: stored.familyId,
      refresh_token,
    };
  }

  /** Revoga a família e solta os aparelhos registrados nessa sessão. */
  private async endSession(
    tx: Prisma.TransactionClient,
    familyId: string,
    userId: bigint,
  ) {
    await lockSession(tx, familyId);
    await tx.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.deviceToken.deleteMany({
      where: { userId, sessionFamilyId: familyId },
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
