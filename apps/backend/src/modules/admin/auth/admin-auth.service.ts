import {
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditRequestContext,
} from '../audit/admin-audit.contracts';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminActor } from './admin-actor';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';
import { AdminOperatorResponseDto } from './dto/admin-operator-response.dto';
import {
  AdminAuthTokenService,
  AdminTokenPayload,
} from './admin-auth-token.service';
import { AdminTelemetryService } from '../../../observability/admin-telemetry.service';
import type { AdminAuthSession, AdminOperatorProfile } from '@taskgo/shared';

const ADMIN_LOGIN_ERROR = 'Invalid administrative credentials';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AdminAuthTokenService,
    private readonly audit: AdminAuditService,
    @Optional() private readonly telemetry?: AdminTelemetryService,
  ) {}

  async login(email: string, password: string): Promise<AdminAuthSession> {
    const normalizedEmail = this.normalizeEmail(email);

    try {
      const operator = await this.prisma.adminUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (
        !operator?.passwordHash ||
        !operator.active ||
        !operator.activatedAt
      ) {
        throw new ForbiddenException(ADMIN_LOGIN_ERROR);
      }

      const passwordMatches = await bcrypt.compare(
        password,
        operator.passwordHash,
      );
      if (!passwordMatches) {
        throw new ForbiddenException(ADMIN_LOGIN_ERROR);
      }

      const { access_token } = this.tokenService.createToken(operator);
      this.telemetry?.recordLogin('success', {
        adminId: operator.id.toString(),
        role: operator.role,
      });

      return {
        operator: this.toResponse(operator),
        access_token,
      };
    } catch (error) {
      this.telemetry?.recordLogin('failure', {
        emailDomain: normalizedEmail.split('@')[1] ?? 'unknown',
        reason:
          error instanceof ForbiddenException ? 'invalid_credentials' : 'error',
      });
      throw error;
    }
  }

  async validatePayload(payload: AdminTokenPayload) {
    const operatorId = this.parseSubject(payload.sub);
    const operator = await this.prisma.adminUser.findUnique({
      where: { id: operatorId },
    });

    if (!operator) {
      throw new UnauthorizedException('Administrative operator not found');
    }

    if (!operator.active) {
      throw new ForbiddenException('Administrative operator is inactive');
    }

    if (operator.tokenVersion !== payload.ver) {
      throw new UnauthorizedException(
        'Administrative authentication token has been invalidated',
      );
    }

    if (operator.role !== payload.role) {
      throw new UnauthorizedException(
        'Administrative authentication token role is stale',
      );
    }

    return operator;
  }

  async changePassword(
    actor: AdminActor,
    dto: AdminChangePasswordDto,
    requestContext: AdminAuditRequestContext,
  ) {
    const operator = await this.prisma.adminUser.findUnique({
      where: { id: actor.id },
    });

    if (!operator?.passwordHash || !operator.active || !operator.activatedAt) {
      throw new ForbiddenException(ADMIN_LOGIN_ERROR);
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      operator.passwordHash,
    );
    if (!passwordMatches) {
      throw new ForbiddenException(ADMIN_LOGIN_ERROR);
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.adminUser.update({
        where: { id: actor.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      await this.audit.append(tx, {
        actor,
        action: AdminAuditAction.AdminUserPasswordChanged,
        target: { type: 'AdminUser', id: actor.id },
        before: { sessionVersion: operator.tokenVersion },
        after: { sessionVersion: saved.tokenVersion },
        ...requestContext,
      });

      return saved;
    });

    return { operator: this.toResponse(updated) };
  }

  toResponse(
    operator: Pick<
      AdminUser,
      'id' | 'name' | 'email' | 'role' | 'active' | 'activatedAt'
    >,
  ): AdminOperatorProfile {
    return new AdminOperatorResponseDto(operator);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private parseSubject(subject: string) {
    try {
      return BigInt(subject);
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid administrative authentication token subject',
      );
    }
  }
}
