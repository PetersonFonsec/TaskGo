import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { isCustomerRole } from '../../shared/auth/authenticated-identity';

const DAY_MS = 86_400_000;
const INVALID = 'Invalid or expired refresh token';

/**
 * Refresh tokens opacos com rotação. Cada uso gera um novo token na mesma
 * família; reapresentar um token já usado revoga a família inteira, porque
 * indica que ele vazou.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: bigint, familyId: string = randomUUID()) {
    const refresh_token = randomBytes(48).toString('base64url');
    const ttlDays = Number(this.config.get('auth.refreshTokenTtlDays') ?? 60);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hash(refresh_token),
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
      },
    });
    return { refresh_token };
  }

  /** Valida e consome o token; devolve o usuário e o próximo refresh token. */
  async rotate(rawToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: {
        user: { select: { type: true, passwordChangedAt: true } },
      },
    });
    if (!stored) throw new UnauthorizedException(INVALID);

    if (stored.revokedAt || stored.usedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID);
    }
    const passwordChangedLater =
      stored.user.passwordChangedAt &&
      stored.user.passwordChangedAt.getTime() >= stored.createdAt.getTime();
    if (
      stored.expiresAt.getTime() <= Date.now() ||
      !isCustomerRole(stored.user.type) ||
      passwordChangedLater
    ) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID);
    }

    // Só uma requisição concorrente consegue consumir o token.
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(INVALID);
    }

    const { refresh_token } = await this.issue(stored.userId, stored.familyId);
    return { userId: stored.userId, refresh_token };
  }

  /** Logout: invalida a sessão do aparelho. Token desconhecido é ignorado. */
  async revoke(rawToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      select: { familyId: true },
    });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
